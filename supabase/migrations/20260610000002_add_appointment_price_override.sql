-- Add price_override column to appointments table
-- This allows per-appointment price customization that overrides the service catalog price

alter table public.appointments
  add column if not exists price_override numeric(12, 2);

-- Update record_payment to use price_override when determining paid status
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
  v_appt           public.appointments;
  v_service        public.services;
  v_effective_price numeric(12, 2);
  v_local_pct      numeric(5, 2);
  v_employee_pct   numeric(5, 2);
  v_local_amount   numeric(12, 2);
  v_employee_amount numeric(12, 2);
  v_tx_id          uuid;
  v_paid_so_far    numeric(12, 2);
  v_exchange_rate  numeric(12, 4);
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

  v_local_pct      := v_service.local_percentage;
  v_employee_pct   := 100 - v_local_pct;
  v_local_amount   := round(p_amount * v_local_pct / 100, 2);
  v_employee_amount := round(p_amount - v_local_amount, 2);

  v_exchange_rate := coalesce(p_exchange_rate,
    (select ves_exchange_rate from public.businesses where id = v_appt.business_id));

  insert into public.transactions (
    business_id, appointment_id,
    total_amount, local_amount, employee_amount,
    local_percentage, employee_percentage,
    method, exchange_rate_used, payments_breakdown,
    created_by, notes
  )
  values (
    v_appt.business_id, p_appointment_id,
    p_amount, v_local_amount, v_employee_amount,
    v_local_pct, v_employee_pct,
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

-- Fix update_transaction to use price_override and handle status reset
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
  v_tx               public.transactions;
  v_local_amount     numeric(12, 2);
  v_employee_amount  numeric(12, 2);
  v_paid_so_far      numeric(12, 2);
  v_service          public.services;
  v_appt             public.appointments;
  v_new_amount       numeric(12, 2);
  v_effective_price  numeric(12, 2);
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
    v_local_amount    := round(v_new_amount * v_tx.local_percentage / 100, 2);
    v_employee_amount := round(v_new_amount - v_local_amount, 2);
  else
    v_local_amount    := v_tx.local_amount;
    v_employee_amount := v_tx.employee_amount;
  end if;

  update public.transactions
  set total_amount      = v_new_amount,
      local_amount      = v_local_amount,
      employee_amount   = v_employee_amount,
      method            = coalesce(p_method, method),
      notes             = coalesce(p_notes, notes),
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

-- Fix delete_transaction to use price_override and reset status when payment fully reversed
create or replace function public.delete_transaction(
  p_transaction_id uuid
)
returns void
language plpgsql
volatile
security invoker
set search_path = public, pg_temp
as $$
declare
  v_tx               public.transactions;
  v_paid_so_far      numeric(12, 2);
  v_service          public.services;
  v_appt             public.appointments;
  v_inventory_count  integer;
  v_effective_price  numeric(12, 2);
begin
  select * into v_tx from public.transactions where id = p_transaction_id;
  if v_tx.id is null then
    raise exception 'Transaction not found';
  end if;

  if not public.is_admin_of(v_tx.business_id) then
    raise exception 'Not authorized';
  end if;

  select * into v_appt from public.appointments where id = v_tx.appointment_id;

  select count(*) into v_inventory_count
  from public.transactions
  where appointment_id = v_tx.appointment_id;

  if v_inventory_count <= 1 then
    update public.inventory_stock s
    set quantity = s.quantity + abs(m.quantity),
        updated_at = now()
    from public.inventory_movements m
    where m.reference_type = 'appointment'
      and m.reference_id = v_tx.appointment_id
      and m.movement_type = 'sale'
      and s.product_id = m.product_id
      and s.variant_id is not distinct from m.variant_id
      and s.location_id = m.location_id;

    delete from public.inventory_movements
    where reference_type = 'appointment'
      and reference_id = v_tx.appointment_id;
  end if;

  delete from public.transactions where id = p_transaction_id;

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
        when v_paid_so_far >= v_effective_price then v_appt.status
        when v_appt.status = 'completed' then 'confirmed'
        else v_appt.status
      end
  where id = v_tx.appointment_id;
end;
$$;

grant execute on function public.delete_transaction(uuid) to authenticated;
