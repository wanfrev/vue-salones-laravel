-- =============================================================================
-- Sistema de Salones (Luma) — DDL Schema
-- =============================================================================
-- Generado automáticamente desde migraciones (última versión de cada tabla).
-- Ejecutable contra un PostgreSQL limpio.
-- NO incluye: RLS, roles Supabase, schema auth, grants, triggers de auth.
-- =============================================================================

-- Extensiones necesarias
create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- =============================================================================
-- ENUMS + TYPES
-- =============================================================================

do $$ begin
  create type app_role as enum ('superadmin', 'admin', 'empleado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_status as enum (
    'pending', 'confirmed', 'completed', 'cancelled', 'no_show'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('unpaid', 'partial', 'paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum (
    'cash', 'card', 'transfer', 'other',
    'zelle', 'pago_movil', 'mixed', 'cash_ves', 'punto_venta'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_source as enum ('internal', 'public');
exception when duplicate_object then null; end $$;

do $$ begin
  create type employee_absence_type as enum (
    'break', 'vacation', 'sick_leave', 'personal', 'blocked'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type inventory_movement_type as enum (
    'purchase', 'sale', 'adjustment',
    'transfer_in', 'transfer_out', 'return', 'consumption'
  );
exception when duplicate_object then null; end $$;

-- =============================================================================
-- 1. businesses
-- =============================================================================
create table if not exists public.businesses (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  slug                  text not null unique,
  phone                 text,
  address               text,
  timezone              text not null default 'America/Santo_Domingo',
  currency              text not null default 'USD',
  active                boolean not null default true,
  niche_type            text not null default 'salon',
  theme_config          jsonb not null
    default '{"primary":"#2F4156","secondary":"#567CB0"}'::jsonb,
  terminology           jsonb not null
    default '{"client":"Cliente","employee":"Empleado","service":"Servicio","appointment":"Cita","staff":"Personal","pet":"Mascota","owner":"Dueño","breed":"Raza","weight":"Peso","vaccines":"Vacunas"}'::jsonb,
  ves_exchange_rate     numeric(12, 4) not null default 36.5000,
  deleted_at            timestamptz,
  job_titles            jsonb not null default '[]'::jsonb,
  service_categories    jsonb not null default '[]'::jsonb,
  multi_branch_enabled  boolean not null default false,
  features              jsonb not null default '{
    "pos": true,
    "inventario": true,
    "productos": true,
    "proveedores": true,
    "multi_branch": false,
    "gift_cards": true,
    "employees_create_clients": true
  }'::jsonb,
  employee_ves_rate     numeric(12, 4),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists businesses_slug_idx on public.businesses(slug);
create index if not exists idx_businesses_active
  on public.businesses(id) where deleted_at is null;

-- =============================================================================
-- 2. branches
-- =============================================================================
create table if not exists public.branches (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references public.businesses(id) on delete cascade,
  name               text not null,
  address            text,
  phone              text,
  is_default         boolean not null default false,
  active             boolean not null default true,
  ves_exchange_rate  numeric(12, 4),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  unique (business_id, name)
);

create index if not exists branches_business_idx on public.branches(business_id);

-- =============================================================================
-- 3. profiles
-- =============================================================================
-- FK a auth.users (requiere que auth.users exista; si usas PostgreSQL limpio
-- sin Supabase Auth, elimina esta FK o reemplázala por una tabla users propia).
create table if not exists public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  business_id        uuid references public.businesses(id) on delete cascade,
  full_name          text not null,
  role               app_role not null default 'empleado',
  phone              text,
  avatar_url         text,
  active             boolean not null default true,
  job_title          text,
  pay_type           text not null default 'percentage',
  pay_percentage     numeric(5, 2) not null default 50
                       check (pay_percentage between 0 and 100),
  base_salary        numeric(12, 2) not null default 0 check (base_salary >= 0),
  email              text,
  salary_frequency   text not null default 'monthly'
                       check (salary_frequency in ('weekly', 'biweekly', 'monthly')),
  disable_agenda     boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint profiles_tenant_required
    check (role = 'superadmin' or business_id is not null)
);

create index if not exists profiles_business_id_idx on public.profiles(business_id);
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_email_idx on public.profiles(email);

-- =============================================================================
-- 4. services
-- =============================================================================
create table if not exists public.services (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references public.businesses(id) on delete cascade,
  name                text not null,
  description         text,
  duration_minutes    integer not null check (duration_minutes > 0),
  price               numeric(12, 2) not null check (price >= 0),
  local_percentage    numeric(5, 2) not null default 50
                       check (local_percentage between 0 and 100),
  color               text,
  active              boolean not null default true,
  category            text not null default 'otros',
  icon                text,
  service_category_id uuid references public.service_categories(id) on delete set null,
  branch_id           uuid references public.branches(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists services_business_idx on public.services(business_id);
create index if not exists services_business_category_active_idx
  on public.services(business_id, category, active);
create index if not exists services_service_category_idx
  on public.services(service_category_id);
create index if not exists services_branch_idx on public.services(branch_id);

-- =============================================================================
-- 5. service_categories
-- =============================================================================
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

-- =============================================================================
-- 6. service_variants
-- =============================================================================
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

-- =============================================================================
-- 7. employee_services
-- =============================================================================
create table if not exists public.employee_services (
  employee_id  uuid not null references public.profiles(id) on delete cascade,
  service_id   uuid not null references public.services(id) on delete cascade,
  primary key (employee_id, service_id)
);

create index if not exists employee_services_service_idx
  on public.employee_services(service_id);

-- =============================================================================
-- 8. employee_schedules
-- =============================================================================
create table if not exists public.employee_schedules (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references public.profiles(id) on delete cascade,
  weekday      smallint not null check (weekday between 0 and 6),
  start_time   time not null,
  end_time     time not null,
  branch_id    uuid references public.branches(id) on delete set null,
  created_at   timestamptz not null default now(),

  check (end_time > start_time)
);

create index if not exists employee_schedules_employee_idx
  on public.employee_schedules(employee_id, weekday);

-- =============================================================================
-- 9. employee_absences
-- =============================================================================
create table if not exists public.employee_absences (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  employee_id  uuid not null references public.profiles(id) on delete cascade,
  type         employee_absence_type not null default 'blocked',
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  reason       text,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  check (ends_at > starts_at)
);

create index if not exists employee_absences_business_idx
  on public.employee_absences(business_id);
create index if not exists employee_absences_employee_range_idx
  on public.employee_absences(employee_id, starts_at, ends_at);

-- =============================================================================
-- 10. clients
-- =============================================================================
create table if not exists public.clients (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  full_name    text not null,
  phone        text not null,
  email        text,
  notes        text,
  birthday     date,
  metadata     jsonb not null default '{}'::jsonb,
  branch_id    uuid references public.branches(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (business_id, phone)
);

create index if not exists clients_business_idx on public.clients(business_id);
create index if not exists clients_phone_idx on public.clients(business_id, phone);
create index if not exists clients_branch_idx on public.clients(branch_id);

-- =============================================================================
-- 11. client_preferred_services
-- =============================================================================
create table if not exists public.client_preferred_services (
  client_id   uuid not null references public.clients(id) on delete cascade,
  service_id  uuid not null references public.services(id) on delete cascade,
  branch_id   uuid references public.branches(id) on delete set null,
  created_at  timestamptz not null default now(),
  primary key (client_id, service_id)
);

create index if not exists client_preferred_services_service_idx
  on public.client_preferred_services(service_id);
create index if not exists client_preferred_services_branch_idx
  on public.client_preferred_services(branch_id);

-- =============================================================================
-- 12. appointments
-- =============================================================================
create table if not exists public.appointments (
  id                          uuid primary key default gen_random_uuid(),
  business_id                 uuid not null references public.businesses(id) on delete cascade,
  client_id                   uuid not null references public.clients(id) on delete restrict,
  employee_id                 uuid not null references public.profiles(id) on delete restrict,
  service_id                  uuid not null references public.services(id) on delete restrict,
  start_time                  timestamptz not null,
  end_time                    timestamptz not null,
  status                      appointment_status not null default 'pending',
  payment_status              payment_status not null default 'unpaid',
  service_notes               text,
  internal_notes              text,
  reminder_sent_at            timestamptz,
  source                      appointment_source not null default 'internal',
  created_by                  uuid references public.profiles(id) on delete set null,
  branch_id                   uuid references public.branches(id) on delete set null,
  assistant_employee_id       uuid references public.profiles(id) on delete set null,
  assistant_percentage        numeric(5, 2),
  group_id                    uuid,
  price_override              numeric(12, 2),
  employee_percentage_override numeric(5, 2),
  duration_override           numeric(6, 2),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),

  check (end_time > start_time)
);

create index if not exists appointments_business_start_idx
  on public.appointments(business_id, start_time);
create index if not exists appointments_employee_start_idx
  on public.appointments(employee_id, start_time);
create index if not exists appointments_client_start_idx
  on public.appointments(client_id, start_time desc);
create index if not exists appointments_status_idx
  on public.appointments(business_id, status);
create index if not exists appointments_reminder_idx
  on public.appointments(start_time)
  where reminder_sent_at is null and status in ('pending', 'confirmed');
create index if not exists appointments_group_id_idx
  on public.appointments(group_id);

-- =============================================================================
-- 13. appointment_services
-- =============================================================================
create table if not exists public.appointment_services (
  id                  uuid primary key default gen_random_uuid(),
  appointment_id      uuid not null references public.appointments(id) on delete cascade,
  service_id          uuid not null references public.services(id) on delete restrict,
  employee_id         uuid not null references public.profiles(id) on delete restrict,
  assistant_id        uuid references public.profiles(id) on delete set null,
  assistant_percentage numeric(5, 2) default 0,
  price_applied       numeric(12, 2) not null,
  created_at          timestamptz not null default now()
);

create index if not exists appt_svc_appointment_idx
  on public.appointment_services(appointment_id);
create index if not exists appt_svc_employee_idx
  on public.appointment_services(employee_id);

-- =============================================================================
-- 14. transactions
-- =============================================================================
create table if not exists public.transactions (
  id                   uuid primary key default gen_random_uuid(),
  business_id          uuid not null references public.businesses(id) on delete cascade,
  appointment_id       uuid not null references public.appointments(id) on delete restrict,
  total_amount         numeric(12, 2) not null check (total_amount >= 0),
  local_amount         numeric(12, 2) not null check (local_amount >= 0),
  employee_amount      numeric(12, 2) not null check (employee_amount >= 0),
  assistant_amount     numeric(12, 2) not null default 0,
  local_percentage     numeric(5, 2) not null check (local_percentage between 0 and 100),
  employee_percentage  numeric(5, 2) not null check (employee_percentage between 0 and 100),
  assistant_percentage numeric(5, 2) not null default 0,
  tip_amount           numeric(12, 2) not null default 0,
  method               payment_method not null default 'cash',
  exchange_rate_used   numeric(12, 4) not null default 1.0000,
  payments_breakdown   jsonb not null default '[]'::jsonb,
  paid_at              timestamptz not null default now(),
  created_by           uuid references public.profiles(id) on delete set null,
  notes                text,
  branch_id            uuid references public.branches(id) on delete set null,
  created_at           timestamptz not null default now(),

  constraint transactions_local_employee_assistant_equal_total
    check (round(local_amount + employee_amount + assistant_amount, 2) = round(total_amount, 2)),
  constraint transactions_percentages_sum_100
    check (round(local_percentage + employee_percentage + assistant_percentage, 2) = 100)
);

create index if not exists transactions_business_paid_idx
  on public.transactions(business_id, paid_at desc);
create index if not exists transactions_appointment_idx
  on public.transactions(appointment_id);

-- =============================================================================
-- 15. expenses
-- =============================================================================
create table if not exists public.expenses (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references public.businesses(id) on delete cascade,
  name                text not null,
  category            text not null default 'general',
  amount              numeric(12, 2) not null check (amount >= 0),
  currency            text not null default 'USD',
  original_amount     numeric(12, 2) not null default 0,
  exchange_rate_used  numeric(12, 4) not null default 1.0000,
  expense_date        date not null default current_date,
  notes               text,
  created_by          uuid references public.profiles(id) on delete set null,
  branch_id           uuid references public.branches(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists expenses_business_date_idx
  on public.expenses(business_id, expense_date desc);

-- =============================================================================
-- 16. employee_payments
-- =============================================================================
create table if not exists public.employee_payments (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references public.businesses(id) on delete cascade,
  employee_id         uuid not null references public.profiles(id) on delete cascade,
  amount              numeric(10, 2) not null check (amount > 0),
  currency            text not null default 'USD',
  original_amount     numeric(12, 2) not null default 0,
  exchange_rate_used  numeric(12, 4) not null default 1.0000,
  payment_method      text not null default 'cash',
  type                text not null default 'payment',
  concept             text,
  notes               text,
  payment_date        date not null default current_date,
  created_by          uuid references public.profiles(id),
  branch_id           uuid references public.branches(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_employee_payments_business
  on public.employee_payments(business_id);
create index if not exists idx_employee_payments_employee
  on public.employee_payments(employee_id);
create index if not exists idx_employee_payments_date
  on public.employee_payments(payment_date);
create index if not exists employee_payments_branch_idx
  on public.employee_payments(branch_id);

-- =============================================================================
-- 17. product_categories
-- =============================================================================
create table if not exists public.product_categories (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  parent_id    uuid references public.product_categories(id) on delete set null,
  name         text not null,
  description  text,
  active       boolean not null default true,
  metadata     jsonb not null default '{}'::jsonb,
  branch_id    uuid references public.branches(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (business_id, branch_id, name)
);

create index if not exists product_categories_business_idx
  on public.product_categories(business_id);
create index if not exists product_categories_parent_idx
  on public.product_categories(parent_id);
create index if not exists product_categories_branch_idx
  on public.product_categories(branch_id);

-- =============================================================================
-- 18. products
-- =============================================================================
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
  is_sellable    boolean not null default true,
  active         boolean not null default true,
  metadata       jsonb not null default '{}'::jsonb,
  branch_id      uuid references public.branches(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  unique (business_id, name),
  unique (business_id, sku)
);

create index if not exists products_business_idx on public.products(business_id);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_active_idx on public.products(business_id, active);
create index if not exists products_sellable_idx
  on public.products(business_id, is_sellable) where is_sellable = true;
create index if not exists products_branch_idx on public.products(branch_id);

-- =============================================================================
-- 19. product_variants
-- =============================================================================
create table if not exists public.product_variants (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id) on delete cascade,
  name         text not null,
  sku          text,
  unit_cost    numeric(12, 4) not null default 0 check (unit_cost >= 0),
  unit_price   numeric(12, 4) not null default 0 check (unit_price >= 0),
  metadata     jsonb not null default '{}'::jsonb,
  active       boolean not null default true,
  branch_id    uuid references public.branches(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (product_id, name)
);

create index if not exists product_variants_product_idx
  on public.product_variants(product_id);
create index if not exists product_variants_branch_idx
  on public.product_variants(branch_id);

-- =============================================================================
-- 20. inventory_locations
-- =============================================================================
create table if not exists public.inventory_locations (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  name         text not null,
  is_default   boolean not null default false,
  active       boolean not null default true,
  metadata     jsonb not null default '{}'::jsonb,
  branch_id    uuid references public.branches(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (business_id, branch_id, name)
);

create index if not exists inventory_locations_business_idx
  on public.inventory_locations(business_id);
create index if not exists inventory_locations_branch_idx
  on public.inventory_locations(branch_id);

-- =============================================================================
-- 21. inventory_stock
-- =============================================================================
create table if not exists public.inventory_stock (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  location_id   uuid not null references public.inventory_locations(id) on delete cascade,
  product_id    uuid not null references public.products(id) on delete cascade,
  variant_id    uuid references public.product_variants(id) on delete cascade,
  quantity      numeric(12, 4) not null default 0,
  reserved_qty  numeric(12, 4) not null default 0,
  branch_id     uuid references public.branches(id) on delete set null,
  updated_at    timestamptz not null default now(),

  check (quantity >= 0),
  check (reserved_qty >= 0)
);

create unique index if not exists inventory_stock_unique_idx
  on public.inventory_stock(branch_id, location_id, product_id, variant_id);
create index if not exists inventory_stock_business_idx
  on public.inventory_stock(business_id);

-- =============================================================================
-- 22. inventory_movements
-- =============================================================================
create table if not exists public.inventory_movements (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references public.businesses(id) on delete cascade,
  location_id         uuid not null references public.inventory_locations(id) on delete cascade,
  product_id          uuid not null references public.products(id) on delete cascade,
  variant_id          uuid references public.product_variants(id) on delete cascade,
  movement_type       inventory_movement_type not null,
  quantity            numeric(12, 4) not null,
  unit_cost           numeric(12, 4) not null default 0,
  exchange_rate_used  numeric(12, 4) not null default 1.0000,
  reference_type      text,
  reference_id        uuid,
  notes               text,
  created_by          uuid references public.profiles(id) on delete set null,
  branch_id           uuid references public.branches(id) on delete set null,
  created_at          timestamptz not null default now(),

  check (quantity <> 0)
);

create index if not exists inventory_movements_business_idx
  on public.inventory_movements(business_id, created_at desc);
create index if not exists inventory_movements_product_idx
  on public.inventory_movements(product_id);

-- =============================================================================
-- 23. suppliers
-- =============================================================================
create table if not exists public.suppliers (
  id                   uuid primary key default gen_random_uuid(),
  business_id          uuid not null references public.businesses(id) on delete cascade,
  first_name           text not null,
  last_name            text not null,
  phone                text,
  company              text,
  total_debt           numeric(12, 2) not null default 0 check (total_debt >= 0),
  debt_currency        text not null default 'USD' check (debt_currency in ('USD', 'VES')),
  debt_original_amount numeric(12, 2) not null default 0 check (debt_original_amount >= 0),
  debt_exchange_rate   numeric(12, 4) not null default 1 check (debt_exchange_rate > 0),
  notes                text,
  active               boolean not null default true,
  branch_id            uuid references public.branches(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_suppliers_business on public.suppliers(business_id);
create index if not exists idx_suppliers_active on public.suppliers(business_id, active);
create index if not exists suppliers_branch_idx on public.suppliers(branch_id);

-- =============================================================================
-- 24. supplier_payments
-- =============================================================================
create table if not exists public.supplier_payments (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  supplier_id     uuid not null references public.suppliers(id) on delete cascade,
  amount          numeric(12, 2) not null check (amount > 0),
  payment_method  text not null default 'cash',
  payment_date    date not null default current_date,
  notes           text,
  created_by      uuid references public.profiles(id),
  branch_id       uuid references public.branches(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_supplier_payments_business
  on public.supplier_payments(business_id);
create index if not exists idx_supplier_payments_supplier
  on public.supplier_payments(supplier_id);
create index if not exists idx_supplier_payments_date
  on public.supplier_payments(payment_date);
create index if not exists supplier_payments_branch_idx
  on public.supplier_payments(branch_id);

-- =============================================================================
-- 25. notifications
-- =============================================================================
create table if not exists public.notifications (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses(id) on delete cascade,
  profile_id       uuid not null references public.profiles(id) on delete cascade,
  type             text not null,
  title            text not null,
  message          text not null,
  appointment_id   uuid references public.appointments(id) on delete set null,
  client_name      text,
  client_phone     text,
  service_name     text,
  appointment_time timestamptz,
  metadata         jsonb default '{}',
  is_read          boolean not null default false,
  read_at          timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists idx_notifications_unread
  on public.notifications(profile_id, is_read, created_at desc)
  where is_read = false;
create index if not exists idx_notifications_business
  on public.notifications(business_id);

-- =============================================================================
-- 26. gift_cards
-- =============================================================================
create table if not exists public.gift_cards (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  branch_id       uuid references public.branches(id) on delete set null,
  recipient_name  text not null,
  recipient_phone text,
  amount          numeric(12, 2) not null check (amount > 0),
  status          text not null default 'active'
                    check (status in ('active', 'redeemed', 'cancelled')),
  notes           text,
  redeemed_at     timestamptz,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_gift_cards_business on public.gift_cards(business_id);
create index if not exists idx_gift_cards_status on public.gift_cards(business_id, status);

-- =============================================================================
-- TRIGGER FUNCTION: updated_at automático
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Aplicar el trigger a todas las tablas con updated_at
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'businesses', 'branches', 'profiles', 'services', 'service_categories',
    'service_variants', 'clients', 'appointments', 'expenses',
    'employee_absences', 'employee_payments', 'product_categories',
    'products', 'product_variants', 'inventory_locations',
    'inventory_stock', 'suppliers', 'supplier_payments', 'gift_cards'
  ])
  loop
    execute format(
      'drop trigger if exists %I_set_updated_at on public.%I;',
      t, t
    );
    execute format(
      'create trigger %I_set_updated_at
         before update on public.%I
         for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end $$;

-- =============================================================================
-- TRIGGER FUNCTION: employee overlap check
-- =============================================================================
-- Replaces the old GiST exclusion constraint; allows grouped appointments
-- (same group_id) to overlap for multi-service bookings.
create or replace function public.check_employee_overlap()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status not in ('pending', 'confirmed', 'completed') then
    return new;
  end if;

  -- Skip when only non-temporal columns changed (e.g., payment_status update)
  if tg_op = 'UPDATE'
     and old.start_time is not distinct from new.start_time
     and old.end_time is not distinct from new.end_time
     and old.employee_id is not distinct from new.employee_id
     and old.assistant_employee_id is not distinct from new.assistant_employee_id
     and old.status is not distinct from new.status then
    return new;
  end if;

  -- Check main employee
  if exists (
    select 1 from public.appointments a
    where a.id != new.id
      and a.employee_id = new.employee_id
      and a.status in ('pending', 'confirmed', 'completed')
      and tstzrange(a.start_time, a.end_time, '[)') && tstzrange(new.start_time, new.end_time, '[)')
      and (a.group_id is null or new.group_id is null or a.group_id != new.group_id)
  ) then
    raise exception 'El empleado ya tiene una cita en ese horario.' using errcode = '23P01';
  end if;

  -- Check assistant employee
  if new.assistant_employee_id is not null then
    if exists (
      select 1 from public.appointments a
      where a.id != new.id
        and a.employee_id = new.assistant_employee_id
        and a.status in ('pending', 'confirmed', 'completed')
        and tstzrange(a.start_time, a.end_time, '[)') && tstzrange(new.start_time, new.end_time, '[)')
        and (a.group_id is null or new.group_id is null or a.group_id != new.group_id)
    ) then
      raise exception 'El asistente ya tiene una cita como empleado en ese horario.' using errcode = '23P01';
    end if;

    if exists (
      select 1 from public.appointments a
      where a.id != new.id
        and a.assistant_employee_id = new.assistant_employee_id
        and a.status in ('pending', 'confirmed', 'completed')
        and tstzrange(a.start_time, a.end_time, '[)') && tstzrange(new.start_time, new.end_time, '[)')
        and (a.group_id is null or new.group_id is null or a.group_id != new.group_id)
    ) then
      raise exception 'El asistente ya tiene una cita en ese horario.' using errcode = '23P01';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists check_employee_overlap_trigger on public.appointments;
create trigger check_employee_overlap_trigger
  before insert or update on public.appointments
  for each row execute function public.check_employee_overlap();

-- =============================================================================
-- FUNCIONES SQL PURAS (sin auth, sin security definer)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- financial_summary: resumen financiero por periodo (sin check de auth)
-- ---------------------------------------------------------------------------
create or replace function public.financial_summary(
  p_business_id  uuid,
  p_period_start date,
  p_period_end   date,
  p_period       text default 'day',
  p_employee_id  uuid default null,
  p_branch_id    uuid default null
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
set search_path = public, pg_temp
as $$
declare
  v_trunc text;
  v_tz    text;
begin
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
    and (p_branch_id is null or t.branch_id = p_branch_id)
  group by 1
  order by 1;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_low_stock_products (sin security definer)
-- ---------------------------------------------------------------------------
create or replace function public.get_low_stock_products()
returns table(
  business_id    uuid,
  id             uuid,
  name           text,
  reorder_point  numeric,
  total_stock    numeric
)
language sql
stable
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

-- ---------------------------------------------------------------------------
-- active_businesses: negocios no eliminados lógicamente
-- ---------------------------------------------------------------------------
create or replace function public.active_businesses()
returns setof public.businesses
language sql
stable
as $$
  select * from public.businesses where deleted_at is null;
$$;
