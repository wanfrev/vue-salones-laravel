-- =============================================================================
-- Add branch_id to all domain tables for full multi-branch isolation
-- =============================================================================
-- Previously only 6 tables had branch_id (appointments, transactions,
-- expenses, employee_schedules, inventory_stock, inventory_movements).
-- This migration adds it to every other operational table so switching
-- branches filters ALL data, not just the agenda.
--

-- 1. Domain tables
alter table public.clients
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

alter table public.services
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

alter table public.products
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

alter table public.product_categories
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

alter table public.product_variants
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

alter table public.suppliers
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

alter table public.supplier_payments
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

alter table public.employee_payments
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

alter table public.inventory_locations
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

-- Junction tables
alter table public.client_preferred_services
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

-- 2. Backfill: assign all existing rows to the default branch of their business
do $$
declare
  biz record;
  v_branch_id uuid;
begin
  for biz in select id from public.businesses where deleted_at is null
  loop
    select id into v_branch_id from public.branches
    where business_id = biz.id and is_default = true
    limit 1;

    if v_branch_id is not null then
      update public.clients set branch_id = v_branch_id where business_id = biz.id and branch_id is null;
      update public.services set branch_id = v_branch_id where business_id = biz.id and branch_id is null;
      update public.products set branch_id = v_branch_id where business_id = biz.id and branch_id is null;
      update public.product_categories set branch_id = v_branch_id where business_id = biz.id and branch_id is null;
      update public.product_variants pv set branch_id = v_branch_id from public.products p where pv.product_id = p.id and p.business_id = biz.id and pv.branch_id is null;
      update public.suppliers set branch_id = v_branch_id where business_id = biz.id and branch_id is null;
      update public.supplier_payments set branch_id = v_branch_id where business_id = biz.id and branch_id is null;
      update public.employee_payments set branch_id = v_branch_id where business_id = biz.id and branch_id is null;
      update public.inventory_locations set branch_id = v_branch_id where business_id = biz.id and branch_id is null;
      update public.client_preferred_services cps set branch_id = v_branch_id from public.clients c where cps.client_id = c.id and c.business_id = biz.id and cps.branch_id is null;
    end if;
  end loop;
end;
$$;

-- 3. Add indexes for performance
create index if not exists clients_branch_idx on public.clients(branch_id);
create index if not exists services_branch_idx on public.services(branch_id);
create index if not exists products_branch_idx on public.products(branch_id);
create index if not exists product_categories_branch_idx on public.product_categories(branch_id);
create index if not exists product_variants_branch_idx on public.product_variants(branch_id);
create index if not exists suppliers_branch_idx on public.suppliers(branch_id);
create index if not exists supplier_payments_branch_idx on public.supplier_payments(branch_id);
create index if not exists employee_payments_branch_idx on public.employee_payments(branch_id);
create index if not exists inventory_locations_branch_idx on public.inventory_locations(branch_id);
create index if not exists client_preferred_services_branch_idx on public.client_preferred_services(branch_id);
