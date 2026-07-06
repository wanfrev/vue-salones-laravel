-- =============================================================================
-- Fix product_categories constraint for multi-branch isolation
-- =============================================================================
-- product_categories had unique(business_id, name) which prevented
-- creating the same category name in different branches of the same business.
-- Changed to (business_id, branch_id, name) to allow per-branch categories.

alter table public.product_categories
  drop constraint if exists product_categories_business_id_name_key;

alter table public.product_categories
  add unique (business_id, branch_id, name);
