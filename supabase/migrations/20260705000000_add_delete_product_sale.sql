-- Delete a single product sale from inventory_movements and revert stock
create or replace function public.delete_product_sale(
  p_movement_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_movement public.inventory_movements;
  v_business_id uuid;
begin
  select * into v_movement from public.inventory_movements where id = p_movement_id;
  if v_movement.id is null then
    raise exception 'Movimiento de inventario no encontrado';
  end if;

  if v_movement.movement_type <> 'sale' then
    raise exception 'Solo se pueden eliminar ventas de productos';
  end if;

  select business_id into v_business_id
  from public.inventory_locations
  where id = v_movement.location_id;

  if not public.is_admin_of(v_business_id) then
    raise exception 'No autorizado';
  end if;

  -- Revert stock: add back the absolute quantity sold
  update public.inventory_stock
  set quantity = quantity + abs(v_movement.quantity),
      updated_at = now()
  where product_id = v_movement.product_id
    and variant_id is not distinct from v_movement.variant_id
    and location_id = v_movement.location_id;

  -- Delete the movement
  delete from public.inventory_movements where id = p_movement_id;
end;
$$;

grant execute on function public.delete_product_sale(uuid) to authenticated;
