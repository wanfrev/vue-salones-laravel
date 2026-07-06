-- =============================================================================
-- Fix record_payment and check_employee_overlap for past appointment payments
-- =============================================================================
-- Problem 1: check_employee_overlap fires on every UPDATE to appointments,
-- including when record_payment only changes payment_status. If overlapping
-- data exists (from migrations with trigger disabled), the payment is blocked.
-- Fix: skip overlap check when temporal/scheduling columns haven't changed.
--
-- Problem 2: check_employee_overlap lacked security definer and set search_path.
-- Fix: add both for consistency with other security-relevant triggers.
--
-- Problem 3: record_payment was security invoker (same bug pattern that was
-- already fixed for delete_transaction and update_transaction).
-- Fix: change to security definer.

-- 1. Fix check_employee_overlap: guard + security hardening
create or replace function public.check_employee_overlap()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status not in ('pending', 'confirmed', 'completed') then
    return new;
  end if;

  -- Skip overlap validation when only payment_status or other non-temporal
  -- columns are being updated (e.g., when record_payment marks an appointment as paid).
  if old.start_time is not distinct from new.start_time
     and old.end_time is not distinct from new.end_time
     and old.employee_id is not distinct from new.employee_id
     and old.assistant_employee_id is not distinct from new.assistant_employee_id
     and old.status is not distinct from new.status then
    return new;
  end if;

  -- Check main employee
  if exists (
    select 1 from public.appointments a
    where a.id != new.id
      and a.employee_id = new.employee_id
      and a.status in ('pending', 'confirmed', 'completed')
      and tstzrange(a.start_time, a.end_time, '[)') && tstzrange(new.start_time, new.end_time, '[)')
      and (a.group_id is null or new.group_id is null or a.group_id != new.group_id)
  ) then
    raise exception 'El empleado ya tiene una cita en ese horario.' using errcode = '23P01';
  end if;

  -- Check assistant employee (if assigned)
  if new.assistant_employee_id is not null then
    if exists (
      select 1 from public.appointments a
      where a.id != new.id
        and a.employee_id = new.assistant_employee_id
        and a.status in ('pending', 'confirmed', 'completed')
        and tstzrange(a.start_time, a.end_time, '[)') && tstzrange(new.start_time, new.end_time, '[)')
        and (a.group_id is null or new.group_id is null or a.group_id != new.group_id)
    ) then
      raise exception 'El asistente ya tiene una cita como empleado en ese horario.' using errcode = '23P01';
    end if;

    if exists (
      select 1 from public.appointments a
      where a.id != new.id
        and a.assistant_employee_id = new.assistant_employee_id
        and a.status in ('pending', 'confirmed', 'completed')
        and tstzrange(a.start_time, a.end_time, '[)') && tstzrange(new.start_time, new.end_time, '[)')
        and (a.group_id is null or new.group_id is null or a.group_id != new.group_id)
    ) then
      raise exception 'El asistente ya tiene una cita en ese horario.' using errcode = '23P01';
    end if;
  end if;

  return new;
end;
$$;

-- 2. Fix record_payment: security definer (matching record_sale, delete_transaction, update_transaction)
drop function if exists public.record_payment(uuid, numeric, payment_method, text, numeric, jsonb, numeric);

create or replace function public.record_payment(
  p_appointment_id       uuid,
  p_amount               numeric,
  p_method               payment_method default 'cash',
  p_notes                text default null,
  p_exchange_rate        numeric default null,
  p_payments_breakdown   jsonb default '[]'::jsonb,
  p_tip_amount           numeric default 0
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_appt               public.appointments;
  v_service            public.services;
  v_employee_profile   public.profiles;
  v_effective_price    numeric(12, 2);
  v_local_pct          numeric(5, 2);
  v_employee_pct       numeric(5, 2);
  v_assistant_pct      numeric(5, 2);
  v_local_amount       numeric(12, 2);
  v_employee_amount    numeric(12, 2);
  v_assistant_amount   numeric(12, 2);
  v_total_amount       numeric(12, 2);
  v_tx_id              uuid;
  v_paid_so_far        numeric(12, 2);
  v_exchange_rate      numeric(12, 4);
begin
  select * into v_appt from public.appointments where id = p_appointment_id;
  if v_appt.id is null then
    raise exception 'Appointment not found';
  end if;

  if not public.is_admin_of(v_appt.business_id) then
    raise exception 'Not authorized';
  end if;

  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select * into v_service from public.services where id = v_appt.service_id;

  select * into v_employee_profile from public.profiles where id = v_appt.employee_id;

  v_effective_price := coalesce(v_appt.price_override, v_service.price);

  v_assistant_pct   := coalesce(v_appt.assistant_percentage, 0);
  v_employee_pct    := coalesce(
    v_appt.employee_percentage_override,
    v_employee_profile.pay_percentage,
    100 - v_service.local_percentage
  );
  v_local_pct       := 100 - v_employee_pct - v_assistant_pct;

  -- Commission on the service portion (not tip)
  v_assistant_amount := round(p_amount * v_assistant_pct / 100, 2);
  -- Tip goes 100% to employee on top of their commission
  v_employee_amount  := round(p_amount * v_employee_pct / 100, 2) + coalesce(p_tip_amount, 0);
  v_local_amount     := round(p_amount - round(p_amount * v_employee_pct / 100, 2) - v_assistant_amount, 2);

  -- Total includes service + tip
  v_total_amount := p_amount + coalesce(p_tip_amount, 0);

  -- Cascade: explicit override → branch rate → business rate → 1
  v_exchange_rate := coalesce(
    p_exchange_rate,
    (select b.ves_exchange_rate from public.branches b where b.id = v_appt.branch_id),
    (select bz.ves_exchange_rate from public.businesses bz where bz.id = v_appt.business_id),
    1
  );

  insert into public.transactions (
    business_id, branch_id, appointment_id,
    total_amount, local_amount, employee_amount, assistant_amount,
    local_percentage, employee_percentage, assistant_percentage,
    method, exchange_rate_used, payments_breakdown,
    created_by, notes, tip_amount
  )
  values (
    v_appt.business_id, v_appt.branch_id, p_appointment_id,
    v_total_amount, v_local_amount, v_employee_amount, v_assistant_amount,
    v_local_pct, v_employee_pct, v_assistant_pct,
    p_method, v_exchange_rate, p_payments_breakdown,
    auth.uid(), p_notes, coalesce(p_tip_amount, 0)
  )
  returning id into v_tx_id;

  -- Payment status: exclude tips from the "paid" check
  select coalesce(sum(total_amount - coalesce(tip_amount, 0)), 0) into v_paid_so_far
  from public.transactions
  where appointment_id = p_appointment_id;

  update public.appointments
  set payment_status = case
        when v_paid_so_far >= v_effective_price then 'paid'::payment_status
        when v_paid_so_far > 0                 then 'partial'::payment_status
        else 'unpaid'::payment_status
      end
  where id = p_appointment_id;

  return v_tx_id;
end;
$$;

grant execute on function public.record_payment(uuid, numeric, payment_method, text, numeric, jsonb, numeric) to authenticated;
