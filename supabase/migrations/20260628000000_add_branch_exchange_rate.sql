-- Migration: Add per-branch exchange rate support
-- Each branch can have its own VES exchange rate.
-- Falls back to the business-level rate if the branch has none set.

-- 1. Add column to branches table
alter table public.branches
  add column if not exists ves_exchange_rate numeric(12, 4);

-- 2. Backfill existing branches with the business rate
do $$
declare
  r record;
begin
  for r in select b.id as branch_id, bz.ves_exchange_rate as biz_rate
           from public.branches b
           join public.businesses bz on bz.id = b.business_id
           where b.ves_exchange_rate is null
  loop
    update public.branches
    set ves_exchange_rate = r.biz_rate
    where id = r.branch_id;
  end loop;
end;
$$;

-- 3. Update record_payment: cascade p_exchange_rate → branch rate → business rate
create or replace function public.record_payment(
  p_appointment_id uuid,
  p_amount         numeric,
  p_method         payment_method default 'cash',
  p_notes          text default null,
  p_exchange_rate  numeric default null,
  p_payments_breakdown jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
volatile
security invoker
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

  v_assistant_amount := round(p_amount * v_assistant_pct / 100, 2);
  v_employee_amount  := round(p_amount * v_employee_pct / 100, 2);
  v_local_amount     := round(p_amount - v_employee_amount - v_assistant_amount, 2);

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
    created_by, notes
  )
  values (
    v_appt.business_id, v_appt.branch_id, p_appointment_id,
    p_amount, v_local_amount, v_employee_amount, v_assistant_amount,
    v_local_pct, v_employee_pct, v_assistant_pct,
    p_method, v_exchange_rate, p_payments_breakdown,
    auth.uid(), p_notes
  )
  returning id into v_tx_id;

  select coalesce(sum(total_amount), 0) into v_paid_so_far
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

grant execute on function public.record_payment(uuid, numeric, payment_method, text, numeric, jsonb) to authenticated;
