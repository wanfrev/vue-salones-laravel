-- =============================================================================
-- Update record_sale to filter inventory by branch_id
-- Derives branch_id from the appointment and filters inventory_stock,
-- inventory_locations, and inventory_movements writes accordingly.
-- =============================================================================
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
  v_biz_id      uuid;
  v_branch_id   uuid;
begin
  select public.record_payment(
    p_appointment_id, p_amount, p_method, p_notes,
    p_exchange_rate, p_payments_breakdown
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

grant execute on function public.record_sale(uuid, numeric, payment_method, jsonb, text, numeric, jsonb) to authenticated;
