-- =============================================================================
-- Fix delete_transaction and update_transaction: change to security definer
-- so the internal DELETE/UPDATE bypasses RLS and relies on is_admin_of().
--
-- Bug: Both functions were security invoker, meaning the DML inside them
-- went through RLS. If the RLS policies on transactions were missing,
-- outdated, or mismatched, the DELETE/UPDATE silently did nothing (0 rows)
-- and the function returned void without raising an error. The frontend
-- showed "Cobro eliminado correctamente" but the record remained.
-- =============================================================================

-- 1. Fix delete_transaction
create or replace function public.delete_transaction(
  p_transaction_id uuid
)
returns void
language plpgsql
volatile
security definer
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

-- 2. Fix update_transaction
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
security definer
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
