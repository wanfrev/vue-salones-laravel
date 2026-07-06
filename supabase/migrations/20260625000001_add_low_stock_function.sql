-- =============================================================================
-- get_low_stock_products: returns products where total stock <= reorder_point
-- Used by the generate-reminders edge function for low stock notifications.
-- =============================================================================
create or replace function public.get_low_stock_products()
returns table(
  business_id uuid,
  id uuid,
  name text,
  reorder_point numeric,
  total_stock numeric
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    p.business_id,
    p.id,
    p.name,
    p.reorder_point,
    coalesce(sum(s.quantity), 0) as total_stock
  from public.products p
  left join public.inventory_stock s on s.product_id = p.id
  where p.active = true
    and p.is_sellable = true
    and p.reorder_point > 0
  group by p.business_id, p.id
  having coalesce(sum(s.quantity), 0) <= p.reorder_point
  order by p.business_id, p.name;
$$;
