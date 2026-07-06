-- =============================================================================
-- Inventory + flexible service variants
-- =============================================================================

-- Movement types for stock changes.
do $$ begin
  create type inventory_movement_type as enum (
    'purchase',
    'sale',
    'adjustment',
    'transfer_in',
    'transfer_out',
    'return',
    'consumption'
  );
exception when duplicate_object then null; end $$;

-- Service categories (supports nesting).
create table if not exists public.service_categories (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  parent_id    uuid references public.service_categories(id) on delete set null,
  name         text not null,
  description  text,
  active       boolean not null default true,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (business_id, name)
);

create index if not exists service_categories_business_idx
  on public.service_categories(business_id);
create index if not exists service_categories_parent_idx
  on public.service_categories(parent_id);

alter table public.services
  add column if not exists service_category_id uuid
    references public.service_categories(id) on delete set null;

create index if not exists services_service_category_idx
  on public.services(service_category_id);

-- Service variants (e.g., sencillo / medio / full).
create table if not exists public.service_variants (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses(id) on delete cascade,
  service_id       uuid not null references public.services(id) on delete cascade,
  name             text not null,
  description      text,
  duration_minutes integer,
  price            numeric(12, 2),
  active           boolean not null default true,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (service_id, name)
);

create index if not exists service_variants_service_idx
  on public.service_variants(service_id);
create index if not exists service_variants_business_idx
  on public.service_variants(business_id);

-- Product categories (supports nesting).
create table if not exists public.product_categories (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  parent_id    uuid references public.product_categories(id) on delete set null,
  name         text not null,
  description  text,
  active       boolean not null default true,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (business_id, name)
);

create index if not exists product_categories_business_idx
  on public.product_categories(business_id);
create index if not exists product_categories_parent_idx
  on public.product_categories(parent_id);

-- Products (base item).
create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses(id) on delete cascade,
  category_id    uuid references public.product_categories(id) on delete set null,
  name           text not null,
  description    text,
  sku            text,
  barcode        text,
  unit           text not null default 'unit',
  unit_cost      numeric(12, 4) not null default 0 check (unit_cost >= 0),
  unit_price     numeric(12, 4) not null default 0 check (unit_price >= 0),
  reorder_point  numeric(12, 4) not null default 0 check (reorder_point >= 0),
  active         boolean not null default true,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  unique (business_id, name),
  unique (business_id, sku)
);

create index if not exists products_business_idx
  on public.products(business_id);
create index if not exists products_category_idx
  on public.products(category_id);
create index if not exists products_active_idx
  on public.products(business_id, active);

-- Product variants (optional; e.g., size/color).
create table if not exists public.product_variants (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id) on delete cascade,
  name         text not null,
  sku          text,
  unit_cost    numeric(12, 4) not null default 0 check (unit_cost >= 0),
  unit_price   numeric(12, 4) not null default 0 check (unit_price >= 0),
  metadata     jsonb not null default '{}'::jsonb,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (product_id, name)
);

create index if not exists product_variants_product_idx
  on public.product_variants(product_id);

-- Inventory locations (e.g., salon, almacen).
create table if not exists public.inventory_locations (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  name         text not null,
  is_default   boolean not null default false,
  active       boolean not null default true,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (business_id, name)
);

create index if not exists inventory_locations_business_idx
  on public.inventory_locations(business_id);

-- Stock levels per location (either product or variant).
create table if not exists public.inventory_stock (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  location_id   uuid not null references public.inventory_locations(id) on delete cascade,
  product_id    uuid not null references public.products(id) on delete cascade,
  variant_id    uuid references public.product_variants(id) on delete cascade,
  quantity      numeric(12, 4) not null default 0,
  reserved_qty  numeric(12, 4) not null default 0,
  updated_at    timestamptz not null default now(),

  check (quantity >= 0),
  check (reserved_qty >= 0)
);

create unique index if not exists inventory_stock_unique_idx
  on public.inventory_stock(location_id, product_id, variant_id);
create index if not exists inventory_stock_business_idx
  on public.inventory_stock(business_id);

-- Stock movements (audit trail).
create table if not exists public.inventory_movements (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  location_id     uuid not null references public.inventory_locations(id) on delete cascade,
  product_id      uuid not null references public.products(id) on delete cascade,
  variant_id      uuid references public.product_variants(id) on delete cascade,
  movement_type   inventory_movement_type not null,
  quantity        numeric(12, 4) not null,
  unit_cost       numeric(12, 4) not null default 0,
  reference_type  text,
  reference_id    uuid,
  notes           text,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),

  check (quantity <> 0)
);

create index if not exists inventory_movements_business_idx
  on public.inventory_movements(business_id, created_at desc);
create index if not exists inventory_movements_product_idx
  on public.inventory_movements(product_id);

-- Updated_at triggers
drop trigger if exists service_categories_set_updated_at on public.service_categories;
create trigger service_categories_set_updated_at
  before update on public.service_categories
  for each row execute function public.set_updated_at();

drop trigger if exists service_variants_set_updated_at on public.service_variants;
create trigger service_variants_set_updated_at
  before update on public.service_variants
  for each row execute function public.set_updated_at();

drop trigger if exists product_categories_set_updated_at on public.product_categories;
create trigger product_categories_set_updated_at
  before update on public.product_categories
  for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists product_variants_set_updated_at on public.product_variants;
create trigger product_variants_set_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

drop trigger if exists inventory_locations_set_updated_at on public.inventory_locations;
create trigger inventory_locations_set_updated_at
  before update on public.inventory_locations
  for each row execute function public.set_updated_at();

drop trigger if exists inventory_stock_set_updated_at on public.inventory_stock;
create trigger inventory_stock_set_updated_at
  before update on public.inventory_stock
  for each row execute function public.set_updated_at();

-- RLS enablement
alter table public.service_categories enable row level security;
alter table public.service_variants enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory_locations enable row level security;
alter table public.inventory_stock enable row level security;
alter table public.inventory_movements enable row level security;

-- RLS policies (read for staff, write for admins)
drop policy if exists service_categories_select on public.service_categories;
create policy service_categories_select on public.service_categories
  for select to authenticated
  using (public.is_staff_of(business_id));

drop policy if exists service_categories_write on public.service_categories;
create policy service_categories_write on public.service_categories
  for all to authenticated
  using (public.is_admin_of(business_id))
  with check (public.is_admin_of(business_id));

drop policy if exists service_variants_select on public.service_variants;
create policy service_variants_select on public.service_variants
  for select to authenticated
  using (public.is_staff_of(business_id));

drop policy if exists service_variants_write on public.service_variants;
create policy service_variants_write on public.service_variants
  for all to authenticated
  using (public.is_admin_of(business_id))
  with check (public.is_admin_of(business_id));

drop policy if exists product_categories_select on public.product_categories;
create policy product_categories_select on public.product_categories
  for select to authenticated
  using (public.is_staff_of(business_id));

drop policy if exists product_categories_write on public.product_categories;
create policy product_categories_write on public.product_categories
  for all to authenticated
  using (public.is_admin_of(business_id))
  with check (public.is_admin_of(business_id));

drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select to authenticated
  using (public.is_staff_of(business_id));

drop policy if exists products_write on public.products;
create policy products_write on public.products
  for all to authenticated
  using (public.is_admin_of(business_id))
  with check (public.is_admin_of(business_id));

drop policy if exists product_variants_select on public.product_variants;
create policy product_variants_select on public.product_variants
  for select to authenticated
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_variants.product_id
        and public.is_staff_of(p.business_id)
    )
  );

drop policy if exists product_variants_write on public.product_variants;
create policy product_variants_write on public.product_variants
  for all to authenticated
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_variants.product_id
        and public.is_admin_of(p.business_id)
    )
  )
  with check (
    exists (
      select 1
      from public.products p
      where p.id = product_variants.product_id
        and public.is_admin_of(p.business_id)
    )
  );

drop policy if exists inventory_locations_select on public.inventory_locations;
create policy inventory_locations_select on public.inventory_locations
  for select to authenticated
  using (public.is_staff_of(business_id));

drop policy if exists inventory_locations_write on public.inventory_locations;
create policy inventory_locations_write on public.inventory_locations
  for all to authenticated
  using (public.is_admin_of(business_id))
  with check (public.is_admin_of(business_id));

drop policy if exists inventory_stock_select on public.inventory_stock;
create policy inventory_stock_select on public.inventory_stock
  for select to authenticated
  using (public.is_staff_of(business_id));

drop policy if exists inventory_stock_write on public.inventory_stock;
create policy inventory_stock_write on public.inventory_stock
  for all to authenticated
  using (public.is_admin_of(business_id))
  with check (public.is_admin_of(business_id));

drop policy if exists inventory_movements_select on public.inventory_movements;
create policy inventory_movements_select on public.inventory_movements
  for select to authenticated
  using (public.is_staff_of(business_id));

drop policy if exists inventory_movements_write on public.inventory_movements;
create policy inventory_movements_write on public.inventory_movements
  for all to authenticated
  using (public.is_admin_of(business_id))
  with check (public.is_admin_of(business_id));
