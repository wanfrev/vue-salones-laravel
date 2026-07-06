-- =============================================================================
-- Sistema de Salones — Aplicar funciones de negocio core
-- =============================================================================
-- Safe to re-run: todas usan `create or replace`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- financial_summary: resumen financiero por período (usado en Finanzas view)
-- -----------------------------------------------------------------------------
create or replace function public.financial_summary(
  p_business_id  uuid,
  p_period_start date,
  p_period_end   date,
  p_period       text default 'day',
  p_employee_id  uuid default null
)
returns table (
  bucket            date,
  appointments      bigint,
  total_amount      numeric,
  local_amount      numeric,
  employee_amount   numeric
)
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_trunc text;
  v_tz    text;
begin
  if not public.is_staff_of(p_business_id) then
    raise exception 'Not authorized';
  end if;

  if p_period not in ('day', 'week', 'month') then
    raise exception 'p_period must be day|week|month';
  end if;

  v_trunc := p_period;

  select b.timezone into v_tz
  from public.businesses b
  where b.id = p_business_id;

  return query
  select
    date_trunc(v_trunc, (t.paid_at at time zone coalesce(v_tz, 'UTC')))::date as bucket,
    count(distinct t.appointment_id)::bigint                                  as appointments,
    coalesce(sum(t.total_amount), 0)                                          as total_amount,
    coalesce(sum(t.local_amount), 0)                                          as local_amount,
    coalesce(sum(t.employee_amount), 0)                                       as employee_amount
  from public.transactions t
  join public.appointments a on a.id = t.appointment_id
  where t.business_id = p_business_id
    and t.paid_at >= (p_period_start::timestamp at time zone coalesce(v_tz, 'UTC'))
    and t.paid_at <  ((p_period_end + 1)::timestamp at time zone coalesce(v_tz, 'UTC'))
    and (p_employee_id is null or a.employee_id = p_employee_id)
  group by 1
  order by 1;
end;
$$;

grant execute on function public.financial_summary(uuid, date, date, text, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- record_payment: crear pago a partir de una cita (multicurrency)
-- -----------------------------------------------------------------------------
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
        when v_paid_so_far >= v_service.price then 'paid'::payment_status
        when v_paid_so_far > 0                then 'partial'::payment_status
        else 'unpaid'::payment_status
      end
  where id = p_appointment_id;

  return v_tx_id;
end;
$$;

grant execute on function public.record_payment(uuid, numeric, payment_method, text, numeric, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- record_sale: crear pago + descontar inventario (multicurrency)
-- -----------------------------------------------------------------------------
create or replace function public.record_sale(
  p_appointment_id uuid,
  p_amount         numeric,
  p_method         payment_method default 'cash',
  p_products       jsonb default '[]'::jsonb,
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
  v_tx_id       uuid;
  v_product     jsonb;
  v_stock       numeric(12,4);
  v_default_loc uuid;
begin
  select public.record_payment(
    p_appointment_id, p_amount, p_method, p_notes,
    p_exchange_rate, p_payments_breakdown
  ) into v_tx_id;

  if jsonb_array_length(p_products) > 0 then
    select id into v_default_loc
    from public.inventory_locations
    where business_id = (select business_id from public.appointments where id = p_appointment_id)
      and is_default = true
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
        );

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
        );

      insert into public.inventory_movements (
        business_id, location_id, product_id, variant_id,
        movement_type, quantity, unit_cost, reference_type, reference_id,
        notes, created_by
      )
      values (
        (select business_id from public.appointments where id = p_appointment_id),
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

grant execute on function public.record_sale(uuid, numeric, payment_method, jsonb, text, numeric, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- Crear stock inicial para productos existentes sin registro de inventario
-- -----------------------------------------------------------------------------
do $$
begin
  insert into public.inventory_stock (business_id, product_id, location_id, quantity)
  select
    p.business_id,
    p.id,
    loc.id,
    0
  from public.products p
  cross join lateral (
    select il.id
    from public.inventory_locations il
    where il.business_id = p.business_id and il.is_default = true
    limit 1
  ) loc
  where p.active = true
    and not exists (
      select 1 from public.inventory_stock s where s.product_id = p.id
    );
end;
$$;
