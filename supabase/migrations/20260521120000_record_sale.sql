-- =============================================================================
-- record_sale: Pagos + descuento de inventario
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Crear pago y opcionalmente descontar productos del inventario.
-- -----------------------------------------------------------------------------
create or replace function public.record_sale(
  p_appointment_id uuid,
  p_amount         numeric,
  p_method         payment_method default 'cash',
  p_products       jsonb default '[]'::jsonb,   -- [{"product_id": uuid, "variant_id": uuid|null, "quantity": numeric, "location_id": uuid}]
  p_notes          text default null
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
  -- Registrar el pago (reusa la función existente)
  select public.record_payment(p_appointment_id, p_amount, p_method, p_notes) into v_tx_id;

  -- Descontar productos si se pasaron
  if jsonb_array_length(p_products) > 0 then
    -- Obtener ubicación por defecto del negocio
    select id into v_default_loc
    from public.inventory_locations
    where business_id = (select business_id from public.appointments where id = p_appointment_id)
      and is_default = true
    limit 1;

    for v_product in select * from jsonb_array_elements(p_products)
    loop
      -- Validar stock suficiente
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

      -- Descontar stock
      update public.inventory_stock
      set quantity = quantity - (v_product->>'quantity')::numeric,
          updated_at = now()
      where product_id  = (v_product->>'product_id')::uuid
        and variant_id is not distinct from (v_product->>'variant_id')::uuid
        and location_id = coalesce(
          (v_product->>'location_id')::uuid,
          v_default_loc
        );

      -- Registrar movimiento (sale)
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

grant execute on function public.record_sale(uuid, numeric, payment_method, jsonb, text) to authenticated;
