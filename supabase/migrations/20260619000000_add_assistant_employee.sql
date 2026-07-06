-- Add assistant employee support to appointments
-- An assistant can be assigned to an appointment alongside the main employee.
-- Both earn a percentage of the service price.

-- 1. Add assistant fields to appointments
alter table public.appointments
  add column if not exists assistant_employee_id uuid references public.profiles(id) on delete set null,
  add column if not exists assistant_percentage numeric(5, 2);

-- 2. Add assistant fields to transactions
alter table public.transactions
  add column if not exists assistant_amount   numeric(12, 2) not null default 0,
  add column if not exists assistant_percentage numeric(5, 2) not null default 0;

-- Drop old check constraint and add new one with assistant
alter table public.transactions
  drop constraint if exists transactions_local_plus_employee_equals_total;

alter table public.transactions
  add constraint transactions_local_employee_assistant_equal_total
  check (round(local_amount + employee_amount + assistant_amount, 2) = round(total_amount, 2));

alter table public.transactions
  drop constraint if exists transactions_local_percentage_plus_employee_equals_100;

alter table public.transactions
  add constraint transactions_percentages_sum_100
  check (round(local_percentage + employee_percentage + assistant_percentage, 2) = 100);

-- 3. Update record_payment to handle assistant split
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

  v_effective_price := coalesce(v_appt.price_override, v_service.price);

  -- Assistant gets their percentage from what would be the business's share.
  -- Employee keeps their full configured percentage.
  v_assistant_pct   := coalesce(v_appt.assistant_percentage, 0);
  v_employee_pct    := 100 - v_service.local_percentage;
  v_local_pct       := 100 - v_employee_pct - v_assistant_pct;

  v_assistant_amount := round(p_amount * v_assistant_pct / 100, 2);
  v_employee_amount  := round(p_amount * v_employee_pct / 100, 2);
  v_local_amount     := round(p_amount - v_employee_amount - v_assistant_amount, 2);

  v_exchange_rate := coalesce(p_exchange_rate,
    (select ves_exchange_rate from public.businesses where id = v_appt.business_id));

  insert into public.transactions (
    business_id, appointment_id,
    total_amount, local_amount, employee_amount, assistant_amount,
    local_percentage, employee_percentage, assistant_percentage,
    method, exchange_rate_used, payments_breakdown,
    created_by, notes
  )
  values (
    v_appt.business_id, p_appointment_id,
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

-- 4. Update update_transaction to handle assistant
create or replace function public.update_transaction(
  p_transaction_id uuid,
  p_amount         numeric default null,
  p_method         payment_method default null,
  p_notes          text default null,
  p_exchange_rate  numeric default null
)
returns void
language plpgsql
volatile
security invoker
set search_path = public, pg_temp
as $$
declare
  v_tx                public.transactions;
  v_local_amount      numeric(12, 2);
  v_employee_amount   numeric(12, 2);
  v_assistant_amount  numeric(12, 2);
  v_paid_so_far       numeric(12, 2);
  v_service           public.services;
  v_appt              public.appointments;
  v_new_amount        numeric(12, 2);
  v_effective_price   numeric(12, 2);
begin
  select * into v_tx from public.transactions where id = p_transaction_id;
  if v_tx.id is null then
    raise exception 'Transaction not found';
  end if;

  if not public.is_admin_of(v_tx.business_id) then
    raise exception 'Not authorized';
  end if;

  select * into v_appt from public.appointments where id = v_tx.appointment_id;

  v_new_amount := coalesce(p_amount, v_tx.total_amount);

  if v_new_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  if p_amount is not null and p_amount != v_tx.total_amount then
    v_local_amount     := round(v_new_amount * v_tx.local_percentage / 100, 2);
    v_employee_amount  := round(v_new_amount * v_tx.employee_percentage / 100, 2);
    v_assistant_amount := round(v_new_amount - v_local_amount - v_employee_amount, 2);
  else
    v_local_amount     := v_tx.local_amount;
    v_employee_amount  := v_tx.employee_amount;
    v_assistant_amount := v_tx.assistant_amount;
  end if;

  update public.transactions
  set total_amount       = v_new_amount,
      local_amount       = v_local_amount,
      employee_amount    = v_employee_amount,
      assistant_amount   = v_assistant_amount,
      method             = coalesce(p_method, method),
      notes              = coalesce(p_notes, notes),
      exchange_rate_used = coalesce(p_exchange_rate, exchange_rate_used)
  where id = p_transaction_id;

  select coalesce(sum(total_amount), 0) into v_paid_so_far
  from public.transactions
  where appointment_id = v_tx.appointment_id;

  select * into v_service from public.services where id = v_appt.service_id;
  v_effective_price := coalesce(v_appt.price_override, v_service.price);

  update public.appointments
  set payment_status = case
        when v_paid_so_far >= v_effective_price then 'paid'::payment_status
        when v_paid_so_far > 0                 then 'partial'::payment_status
        else 'unpaid'::payment_status
      end,
      status = case
        when v_paid_so_far >= v_effective_price then status
        when v_appt.status = 'completed' then 'confirmed'
        else v_appt.status
      end
  where id = v_tx.appointment_id;
end;
$$;

grant execute on function public.update_transaction(uuid, numeric, payment_method, text, numeric) to authenticated;

-- 5. Update overlap trigger to also check assistant employee
create or replace function public.check_employee_overlap()
returns trigger as $$
begin
  if new.status not in ('pending', 'confirmed', 'completed') then
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
    -- Check if assistant is already booked as main employee at this time
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

    -- Check if assistant is already booked as assistant at this time
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
$$ language plpgsql;

-- 6. Update notification trigger for new_appointment to also notify assistant
create or replace function fn_notify_new_appointment()
returns trigger as $$
begin
  -- Notify main employee
  insert into public.notifications (business_id, profile_id, type, title, message,
    appointment_id, client_name, client_phone, service_name, appointment_time)
  select
    new.business_id, new.employee_id, 'new_appointment',
    'Nueva cita agendada',
    format('%s — %s', c.full_name, s.name),
    new.id, c.full_name, c.phone, s.name, new.start_time
  from public.clients c, public.services s
  where c.id = new.client_id and s.id = new.service_id;

  -- Notify assistant if assigned
  if new.assistant_employee_id is not null then
    insert into public.notifications (business_id, profile_id, type, title, message,
      appointment_id, client_name, client_phone, service_name, appointment_time)
    select
      new.business_id, new.assistant_employee_id, 'new_appointment',
      'Nueva cita como asistente',
      format('%s — %s (asistente)', c.full_name, s.name),
      new.id, c.full_name, c.phone, s.name, new.start_time
    from public.clients c, public.services s
    where c.id = new.client_id and s.id = new.service_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;
