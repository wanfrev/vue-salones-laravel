-- =============================================================================
-- Branches (Sucursales) — Multi-location support
-- =============================================================================
-- A business (tenant) can have multiple physical locations.
-- This separates the "legal entity that pays" (businesses) from the
-- "physical place where work happens" (branches).
--
-- Operational tables (appointments, transactions, expenses, schedules) get
-- a branch_id so the owner can filter dashboards by location.

-- 1. Branches table
create table if not exists public.branches (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  name          text not null,
  address       text,
  phone         text,
  is_default    boolean not null default false,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (business_id, name)
);

create index if not exists branches_business_idx
  on public.branches(business_id);

-- 2. Add branch_id to operational tables
alter table public.appointments
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

alter table public.transactions
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

alter table public.expenses
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

alter table public.employee_schedules
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

alter table public.inventory_stock
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

alter table public.inventory_movements
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

-- 3. Backfill: create a default branch for every existing business
--    and assign all existing rows to it.
do $$
declare
  biz record;
  v_branch_id uuid;
begin
  for biz in select id, name from public.businesses where deleted_at is null
  loop
    insert into public.branches (business_id, name, is_default)
    values (biz.id, biz.name || ' — Principal', true)
    on conflict (business_id, name) do nothing
    returning id into v_branch_id;

    if v_branch_id is null then
      select id into v_branch_id from public.branches
      where business_id = biz.id and is_default = true
      limit 1;
    end if;

    if v_branch_id is not null then
      update public.appointments set branch_id = v_branch_id where business_id = biz.id and branch_id is null;
      update public.transactions set branch_id = v_branch_id where business_id = biz.id and branch_id is null;
      update public.expenses set branch_id = v_branch_id where business_id = biz.id and branch_id is null;
      update public.inventory_stock set branch_id = v_branch_id where business_id = biz.id and branch_id is null;
      update public.inventory_movements set branch_id = v_branch_id where business_id = biz.id and branch_id is null;
      -- employee_schedules has no business_id column; branch can be resolved
      -- through profiles.employee_id → profiles.business_id at query time.
    end if;
  end loop;
end;
$$;

-- 4. RLS for branches
alter table public.branches enable row level security;

create policy "branches_select" on public.branches
  for select to authenticated
  using (public.is_admin_of(business_id) or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.business_id = branches.business_id
  ));

create policy "branches_insert" on public.branches
  for insert to authenticated
  with check (public.is_admin_of(business_id));

create policy "branches_update" on public.branches
  for update to authenticated
  using (public.is_admin_of(business_id));

create policy "branches_delete" on public.branches
  for delete to authenticated
  using (public.is_admin_of(business_id));
