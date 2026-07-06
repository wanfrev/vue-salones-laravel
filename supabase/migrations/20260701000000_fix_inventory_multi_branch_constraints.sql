-- =============================================================================
-- Fix inventory constraints for multi-branch isolation
-- =============================================================================
-- inventory_locations had unique(business_id, name) which prevented
-- creating a "Principal" location per branch. Changed to (business_id, branch_id, name).
--
-- inventory_stock had unique(location_id, product_id, variant_id) without
-- branch_id, which would conflict when two branches share a location.
-- Changed to (branch_id, location_id, product_id, variant_id).

-- 1. Fix inventory_locations unique constraint
alter table public.inventory_locations
  drop constraint if exists inventory_locations_business_id_name_key;

-- Add new constraint: name must be unique per business AND branch
alter table public.inventory_locations
  add unique (business_id, branch_id, name);

-- 2. Fix inventory_stock unique index to include branch_id
drop index if exists inventory_stock_unique_idx;

create unique index inventory_stock_unique_idx
  on public.inventory_stock(branch_id, location_id, product_id, variant_id);
