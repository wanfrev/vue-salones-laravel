-- Add tip/propina support to transactions
-- The tip goes 100% to the employee on top of the service amount.
-- Tip does NOT count toward paying off the appointment's effective price.

-- 1. Add tip_amount column
alter table public.transactions
  add column if not exists tip_amount numeric(12,2) not null default 0;

-- 2. Update record_payment to accept and store tip
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

-- 3. Update record_sale to pass tip_amount through
drop function if exists public.record_sale(uuid, numeric, payment_method, jsonb, text, numeric, jsonb, numeric);

create or replace function public.record_sale(
  p_appointment_id       uuid,
  p_amount               numeric,
  p_method               payment_method default 'cash',
  p_products             jsonb default '[]'::jsonb,
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
  v_tx_id       uuid;
  v_product     jsonb;
  v_stock       numeric(12,4);
  v_default_loc uuid;
  v_biz_id      uuid;
  v_branch_id   uuid;
begin
  select public.record_payment(
    p_appointment_id, p_amount, p_method, p_notes,
    p_exchange_rate, p_payments_breakdown, coalesce(p_tip_amount, 0)
  ) into v_tx_id;

  if jsonb_array_length(p_products) > 0 then
    select business_id, branch_id into v_biz_id, v_branch_id
    from public.appointments where id = p_appointment_id;

    select id into v_default_loc
    from public.inventory_locations
    where business_id = v_biz_id
      and is_default = true
      and (v_branch_id is null or branch_id = v_branch_id)
    limit 1;

    for v_product in select * from jsonb_array_elements(p_products)
    loop
      select quantity into v_stock
      from public.inventory_stock
      where product_id  = (v_product->>'product_id')::uuid
        and variant_id is not distinct from (v_product->>'variant_id')::uuid
        and location_id = coalesce(
          (v_product->>'location_id')::uuid,
          v_default_loc
        )
        and (v_branch_id is null or branch_id = v_branch_id);

      if v_stock is null or v_stock < (v_product->>'quantity')::numeric then
        raise exception 'Stock insuficiente para el producto %', (v_product->>'product_id')::uuid;
      end if;

      update public.inventory_stock
      set quantity = quantity - (v_product->>'quantity')::numeric,
          updated_at = now()
      where product_id  = (v_product->>'product_id')::uuid
        and variant_id is not distinct from (v_product->>'variant_id')::uuid
        and location_id = coalesce(
          (v_product->>'location_id')::uuid,
          v_default_loc
        )
        and (v_branch_id is null or branch_id = v_branch_id);

      insert into public.inventory_movements (
        business_id, branch_id, location_id, product_id, variant_id,
        movement_type, quantity, unit_cost, reference_type, reference_id,
        notes, created_by
      )
      values (
        v_biz_id, v_branch_id,
        coalesce((v_product->>'location_id')::uuid, v_default_loc),
        (v_product->>'product_id')::uuid,
        (v_product->>'variant_id')::uuid,
        'sale',
        -(v_product->>'quantity')::numeric,
        coalesce((v_product->>'unit_cost')::numeric, 0),
        'appointment', p_appointment_id,
        'Venta punto de venta',
        auth.uid()
      );
    end loop;
  end if;

  return v_tx_id;
end;
$$;

-- Grant execute for both new signatures
grant execute on function public.record_payment(uuid, numeric, payment_method, text, numeric, jsonb, numeric) to authenticated;
grant execute on function public.record_sale(uuid, numeric, payment_method, jsonb, text, numeric, jsonb, numeric) to authenticated;
