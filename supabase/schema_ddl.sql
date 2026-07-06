-- =============================================================================
-- schema_ddl.sql — Esquema completo del Sistema de Salones
-- Generado el: 2026-06-25
-- Propósito: Recrear toda la estructura de la base de datos (public schema)
--            en un ambiente nuevo (staging/pre-producción).
-- SIN datos — solo DDL (tablas, tipos, funciones, disparadores, políticas RLS,
-- índices, grants).
--
-- Idempotente: se puede ejecutar múltiples veces sin errores.
-- =============================================================================

-- =============================================================================
-- 1. EXTENSIONES
-- =============================================================================
create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- =============================================================================
-- 2. TIPOS PERSONALIZADOS (ENUMs con manejo idempotente)
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
  create type payment_method as enum ('cash', 'card', 'transfer', 'other');
exception when duplicate_object then null; end $$;

-- Expansiones de payment_method (migraciones posteriores)
alter type public.payment_method add value if not exists 'zelle';
alter type public.payment_method add value if not exists 'pago_movil';
alter type public.payment_method add value if not exists 'mixed';
alter type public.payment_method add value if not exists 'cash_ves';

do $$ begin
  create type appointment_source as enum ('internal', 'public');
exception when duplicate_object then null; end $$;

do $$ begin
  create type employee_absence_type as enum ('break', 'vacation', 'sick_leave', 'personal', 'blocked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inventory_movement_type as enum (
    'purchase', 'sale', 'adjustment', 'transfer_in', 'transfer_out',
    'return', 'consumption'
  );
exception when duplicate_object then null; end $$;

-- =============================================================================
-- 3. TABLAS (con todas las columnas del estado final)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 3.1 businesses
-- -----------------------------------------------------------------------------
create table if not exists public.businesses (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text not null unique,
  phone               text,
  address             text,
  timezone            text not null default 'America/Santo_Domingo',
  currency            text not null default 'USD',
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  niche_type          text not null default 'salon',
  theme_config        jsonb not null default '{"primary":"#2F4156","secondary":"#567CB0"}'::jsonb,
  terminology         jsonb not null default '{"client":"Cliente","employee":"Empleado","service":"Servicio","appointment":"Cita","staff":"Personal","pet":"Mascota","owner":"Dueño","breed":"Raza","weight":"Peso","vaccines":"Vacunas"}'::jsonb,
  ves_exchange_rate   numeric(12, 4) not null default 36.5000,
  job_titles          jsonb not null default '[]'::jsonb,
  service_categories  jsonb not null default '[]'::jsonb,
  multi_branch_enabled boolean not null default false,
  features            jsonb not null default '{"pos":true,"inventario":true,"productos":true,"proveedores":true,"multi_branch":false}'::jsonb
);

-- -----------------------------------------------------------------------------
-- 3.2 branches
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 3.3 profiles
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  business_id       uuid references public.businesses(id) on delete cascade,
  full_name         text not null,
  role              app_role not null default 'empleado',
  phone             text,
  avatar_url        text,
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  job_title         text,
  pay_type          text not null default 'percentage',
  pay_percentage    numeric(5, 2) not null default 50 check (pay_percentage between 0 and 100),
  base_salary       numeric(12, 2) not null default 0 check (base_salary >= 0),
  email             text,

  constraint profiles_tenant_required
    check (role = 'superadmin' or business_id is not null)
);

-- -----------------------------------------------------------------------------
-- 3.4 service_categories
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 3.5 services
-- -----------------------------------------------------------------------------
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
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  category            text not null default 'otros',
  icon                text,
  service_category_id uuid references public.service_categories(id) on delete set null,
  branch_id           uuid references public.branches(id) on delete set null
);

-- -----------------------------------------------------------------------------
-- 3.6 service_variants
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 3.8 employee_services
-- -----------------------------------------------------------------------------
create table if not exists public.employee_services (
  employee_id  uuid not null references public.profiles(id) on delete cascade,
  service_id   uuid not null references public.services(id) on delete cascade,
  primary key (employee_id, service_id)
);

-- -----------------------------------------------------------------------------
-- 3.9 employee_schedules
-- -----------------------------------------------------------------------------
create table if not exists public.employee_schedules (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references public.profiles(id) on delete cascade,
  weekday      smallint not null check (weekday between 0 and 6),
  start_time   time not null,
  end_time     time not null,
  created_at   timestamptz not null default now(),
  branch_id    uuid references public.branches(id) on delete set null,

  check (end_time > start_time)
);

-- -----------------------------------------------------------------------------
-- 3.10 clients
-- -----------------------------------------------------------------------------
create table if not exists public.clients (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  full_name    text not null,
  phone        text not null,
  email        text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  birthday     date,
  metadata     jsonb not null default '{}'::jsonb,
  branch_id    uuid references public.branches(id) on delete set null,

  unique (business_id, phone)
);

-- -----------------------------------------------------------------------------
-- 3.11 client_preferred_services
-- -----------------------------------------------------------------------------
create table if not exists public.client_preferred_services (
  client_id   uuid not null references public.clients(id) on delete cascade,
  service_id  uuid not null references public.services(id) on delete cascade,
  created_at  timestamptz not null default now(),
  branch_id   uuid references public.branches(id) on delete set null,

  primary key (client_id, service_id)
);

-- -----------------------------------------------------------------------------
-- 3.12 appointments
-- -----------------------------------------------------------------------------
create table if not exists public.appointments (
  id                           uuid primary key default gen_random_uuid(),
  business_id                  uuid not null references public.businesses(id) on delete cascade,
  client_id                    uuid not null references public.clients(id) on delete restrict,
  employee_id                  uuid not null references public.profiles(id) on delete restrict,
  service_id                   uuid not null references public.services(id) on delete restrict,
  start_time                   timestamptz not null,
  end_time                     timestamptz not null,
  status                       appointment_status not null default 'pending',
  payment_status               payment_status not null default 'unpaid',
  service_notes                text,
  internal_notes               text,
  reminder_sent_at             timestamptz,
  source                       appointment_source not null default 'internal',
  created_by                   uuid references public.profiles(id) on delete set null,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),
  group_id                     uuid,
  price_override               numeric(12, 2),
  assistant_employee_id        uuid references public.profiles(id) on delete set null,
  assistant_percentage         numeric(5, 2),
  employee_percentage_override numeric(5, 2),
  branch_id                    uuid references public.branches(id) on delete set null,

  check (end_time > start_time)
);

-- -----------------------------------------------------------------------------
-- 3.13 appointment_services
-- -----------------------------------------------------------------------------
create table if not exists public.appointment_services (
  id                   uuid primary key default gen_random_uuid(),
  appointment_id       uuid not null references public.appointments(id) on delete cascade,
  service_id           uuid not null references public.services(id) on delete restrict,
  employee_id          uuid not null references public.profiles(id) on delete restrict,
  assistant_id         uuid references public.profiles(id) on delete set null,
  assistant_percentage numeric(5, 2) default 0,
  price_applied        numeric(12, 2) not null,
  created_at           timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 3.14 transactions
-- -----------------------------------------------------------------------------
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
  method               payment_method not null default 'cash',
  exchange_rate_used   numeric(12, 4) not null default 1.0000,
  payments_breakdown   jsonb not null default '[]'::jsonb,
  paid_at              timestamptz not null default now(),
  created_by           uuid references public.profiles(id) on delete set null,
  notes                text,
  created_at           timestamptz not null default now(),
  branch_id            uuid references public.branches(id) on delete set null,

  constraint transactions_local_employee_assistant_equal_total
    check (round(local_amount + employee_amount + assistant_amount, 2) = round(total_amount, 2)),
  constraint transactions_percentages_sum_100
    check (round(local_percentage + employee_percentage + assistant_percentage, 2) = 100)
);

-- -----------------------------------------------------------------------------
-- 3.15 expenses
-- -----------------------------------------------------------------------------
create table if not exists public.expenses (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references public.businesses(id) on delete cascade,
  name                text not null,
  category            text not null default 'general',
  amount              numeric(12, 2) not null check (amount >= 0),
  expense_date        date not null default current_date,
  notes               text,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  currency            text not null default 'USD',
  original_amount     numeric(12, 2) not null default 0,
  exchange_rate_used  numeric(12, 4) not null default 1.0000,
  branch_id           uuid references public.branches(id) on delete set null
);

-- -----------------------------------------------------------------------------
-- 3.16 employee_absences
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 3.17 product_categories
-- -----------------------------------------------------------------------------
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
  branch_id    uuid references public.branches(id) on delete set null,

  unique (business_id, name)
);

-- -----------------------------------------------------------------------------
-- 3.18 products
-- -----------------------------------------------------------------------------
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
  is_sellable    boolean not null default true,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  branch_id      uuid references public.branches(id) on delete set null,

  unique (business_id, name),
  unique (business_id, sku)
);

-- -----------------------------------------------------------------------------
-- 3.19 product_variants
-- -----------------------------------------------------------------------------
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
  branch_id    uuid references public.branches(id) on delete set null,

  unique (product_id, name)
);

-- -----------------------------------------------------------------------------
-- 3.20 inventory_locations
-- -----------------------------------------------------------------------------
create table if not exists public.inventory_locations (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  name         text not null,
  is_default   boolean not null default false,
  active       boolean not null default true,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  branch_id    uuid references public.branches(id) on delete set null,

  unique (business_id, name)
);

-- -----------------------------------------------------------------------------
-- 3.21 inventory_stock
-- -----------------------------------------------------------------------------
create table if not exists public.inventory_stock (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  location_id   uuid not null references public.inventory_locations(id) on delete cascade,
  product_id    uuid not null references public.products(id) on delete cascade,
  variant_id    uuid references public.product_variants(id) on delete cascade,
  quantity      numeric(12, 4) not null default 0,
  reserved_qty  numeric(12, 4) not null default 0,
  updated_at    timestamptz not null default now(),
  branch_id     uuid references public.branches(id) on delete set null,

  check (quantity >= 0),
  check (reserved_qty >= 0)
);

-- -----------------------------------------------------------------------------
-- 3.22 inventory_movements
-- -----------------------------------------------------------------------------
create table if not exists public.inventory_movements (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references public.businesses(id) on delete cascade,
  location_id        uuid not null references public.inventory_locations(id) on delete cascade,
  product_id         uuid not null references public.products(id) on delete cascade,
  variant_id         uuid references public.product_variants(id) on delete cascade,
  movement_type      inventory_movement_type not null,
  quantity           numeric(12, 4) not null,
  unit_cost          numeric(12, 4) not null default 0,
  exchange_rate_used numeric(12, 4) not null default 1.0000,
  reference_type     text,
  reference_id       uuid,
  notes              text,
  created_by         uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  branch_id          uuid references public.branches(id) on delete set null,

  check (quantity <> 0)
);

-- -----------------------------------------------------------------------------
-- 3.23 employee_payments
-- -----------------------------------------------------------------------------
create table if not exists public.employee_payments (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references public.businesses(id) on delete cascade,
  employee_id         uuid not null references public.profiles(id) on delete cascade,
  amount              numeric(10, 2) not null check (amount > 0),
  payment_method      text not null default 'cash',
  notes               text,
  payment_date        date not null default current_date,
  created_by          uuid references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  type                text not null default 'payment',
  concept             text,
  currency            text not null default 'USD',
  original_amount     numeric(12, 2) not null default 0,
  exchange_rate_used  numeric(12, 4) not null default 1.0000,
  branch_id           uuid references public.branches(id) on delete set null
);

-- -----------------------------------------------------------------------------
-- 3.24 suppliers
-- -----------------------------------------------------------------------------
create table if not exists public.suppliers (
  id                    uuid primary key default gen_random_uuid(),
  business_id           uuid not null references public.businesses(id) on delete cascade,
  first_name            text not null,
  last_name             text not null,
  phone                 text,
  company               text,
  total_debt            numeric(12, 2) not null default 0 check (total_debt >= 0),
  debt_currency         text not null default 'USD' check (debt_currency in ('USD', 'VES')),
  debt_original_amount  numeric(12, 2) not null default 0 check (debt_original_amount >= 0),
  debt_exchange_rate    numeric(12, 4) not null default 1 check (debt_exchange_rate > 0),
  notes                 text,
  active                boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  branch_id             uuid references public.branches(id) on delete set null
);

-- -----------------------------------------------------------------------------
-- 3.25 supplier_payments
-- -----------------------------------------------------------------------------
create table if not exists public.supplier_payments (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  supplier_id     uuid not null references public.suppliers(id) on delete cascade,
  amount          numeric(12, 2) not null check (amount > 0),
  payment_method  text not null default 'cash',
  payment_date    date not null default current_date,
  notes           text,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  branch_id       uuid references public.branches(id) on delete set null
);

-- -----------------------------------------------------------------------------
-- 3.26 notifications
-- -----------------------------------------------------------------------------
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

-- =============================================================================
-- 4. FUNCIONES
-- =============================================================================

-- 4.1 Trigger helper: set_updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 4.2 Auth helpers (RLS support)
create or replace function public.auth_role()
returns app_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.auth_business_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select business_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select role = 'superadmin' from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_admin_of(target_business uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (
        role = 'superadmin'
        or (role = 'admin' and business_id = target_business)
      )
  );
$$;

create or replace function public.is_staff_of(target_business uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (
        role = 'superadmin'
        or business_id = target_business
      )
  );
$$;

-- 4.3 handle_new_user — auto-creación de profile al crear usuario auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (
    id, business_id, full_name, role, phone, avatar_url,
    job_title, pay_type, pay_percentage, base_salary, active, email
  )
  values (
    new.id,
    (new.raw_user_meta_data->>'business_id')::uuid,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      split_part(new.email, '@', 1)
    ),
    coalesce(
      (new.raw_user_meta_data->>'role')::app_role,
      case
        when new.raw_user_meta_data->>'business_id' is null then 'superadmin'::app_role
        else 'empleado'::app_role
      end
    ),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'job_title',
    coalesce(nullif(new.raw_user_meta_data->>'pay_type', ''), 'percentage'),
    coalesce((new.raw_user_meta_data->>'pay_percentage')::numeric, 50),
    coalesce((new.raw_user_meta_data->>'base_salary')::numeric, 0),
    true,
    new.email
  );
  return new;
end;
$$;

-- 4.4 sync_profile_email — sincronizar email desde auth.users
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.profiles
  set email = new.email, updated_at = now()
  where id = new.id;
  return new;
end;
$$;

-- 4.5 active_businesses — helper para listar negocios activos
create or replace function public.active_businesses()
returns setof public.businesses
language sql
stable
as $$
  select * from public.businesses where deleted_at is null;
$$;

-- 4.6 Public booking functions
create or replace function public.public_business_info(p_slug text)
returns table (
  id            uuid,
  name          text,
  timezone      text,
  currency      text,
  niche_type    text,
  theme_config  jsonb,
  terminology   jsonb,
  phone         text,
  address       text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select b.id, b.name, b.timezone, b.currency, b.niche_type, b.theme_config, b.terminology, b.phone, b.address
  from public.businesses b
  where b.slug = p_slug and b.active = true and b.deleted_at is null;
$$;

create or replace function public.public_list_services(p_slug text)
returns table (
  id               uuid,
  name             text,
  description      text,
  duration_minutes integer,
  price            numeric,
  color            text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select s.id, s.name, s.description, s.duration_minutes, s.price, s.color
  from public.services s
  join public.businesses b on b.id = s.business_id
  where b.slug = p_slug
    and b.active = true
    and s.active = true
  order by s.name;
$$;

create or replace function public.public_list_employees_for_service(
  p_slug       text,
  p_service_id uuid
)
returns table (
  id         uuid,
  full_name  text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.full_name, p.avatar_url
  from public.profiles p
  join public.businesses b on b.id = p.business_id
  join public.employee_services es on es.employee_id = p.id
  where b.slug = p_slug
    and b.active = true
    and p.active = true
    and p.role = 'empleado'
    and es.service_id = p_service_id
  order by p.full_name;
$$;

create or replace function public.public_get_available_slots(
  p_slug          text,
  p_employee_id   uuid,
  p_service_id    uuid,
  p_date_from     date,
  p_date_to       date,
  p_slot_minutes  integer default 15
)
returns table (
  slot_start timestamptz,
  slot_end   timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_business_id     uuid;
  v_timezone        text;
  v_duration        integer;
  v_step            interval;
  v_now             timestamptz := now();
  v_max_days        integer := 90;
begin
  if p_date_to < p_date_from then
    raise exception 'p_date_to must be >= p_date_from';
  end if;
  if (p_date_to - p_date_from) > v_max_days then
    raise exception 'Date range too large (max %)', v_max_days;
  end if;
  select b.id, b.timezone
  into v_business_id, v_timezone
  from public.businesses b
  where b.slug = p_slug and b.active = true;
  if v_business_id is null then return; end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = p_employee_id
      and p.business_id = v_business_id
      and p.active = true
      and p.role = 'empleado'
  ) then return; end if;
  select s.duration_minutes into v_duration
  from public.services s
  join public.employee_services es
    on es.service_id = s.id and es.employee_id = p_employee_id
  where s.id = p_service_id
    and s.business_id = v_business_id
    and s.active = true;
  if v_duration is null then return; end if;
  v_step := make_interval(mins => p_slot_minutes);
  return query
  with days as (
    select gs::date as d
    from generate_series(p_date_from, p_date_to, interval '1 day') gs
  ),
  blocks as (
    select
      d.d as day,
      (timezone(v_timezone, (d.d::text || ' ' || sched.start_time::text)::timestamp)) as block_start,
      (timezone(v_timezone, (d.d::text || ' ' || sched.end_time::text)::timestamp)) as block_end
    from days d
    join public.employee_schedules sched on sched.employee_id = p_employee_id
    where extract(dow from (d.d at time zone v_timezone))::int = sched.weekday
  ),
  candidate_slots as (
    select
      gs as slot_start,
      gs + make_interval(mins => v_duration) as slot_end,
      b.block_end as block_end
    from blocks b,
    lateral generate_series(
      b.block_start,
      b.block_end - make_interval(mins => v_duration),
      v_step
    ) gs
  )
  select cs.slot_start, cs.slot_end
  from candidate_slots cs
  where cs.slot_end <= cs.block_end
    and cs.slot_start > v_now
    and not exists (
      select 1 from public.appointments a
      where a.employee_id = p_employee_id
        and a.status in ('pending', 'confirmed', 'completed')
        and tstzrange(a.start_time, a.end_time, '[)')
            && tstzrange(cs.slot_start, cs.slot_end, '[)')
    )
    and not exists (
      select 1 from public.employee_absences ea
      where ea.employee_id = p_employee_id
        and ea.business_id = v_business_id
        and tstzrange(ea.starts_at, ea.ends_at, '[)')
            && tstzrange(cs.slot_start, cs.slot_end, '[)')
    )
  order by cs.slot_start;
end;
$$;

create or replace function public.public_book_appointment(
  p_slug         text,
  p_employee_id  uuid,
  p_service_id   uuid,
  p_start_time   timestamptz,
  p_client_name  text,
  p_client_phone text,
  p_client_email text default null,
  p_client_notes text default null
)
returns table (
  appointment_id uuid,
  start_time     timestamptz,
  end_time       timestamptz,
  status         appointment_status
)
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_business_id  uuid;
  v_duration     integer;
  v_end_time     timestamptz;
  v_client_id    uuid;
  v_appt_id      uuid;
  v_clean_phone  text;
  v_clean_name   text;
begin
  v_clean_phone := nullif(trim(p_client_phone), '');
  v_clean_name  := nullif(trim(p_client_name), '');
  if v_clean_phone is null or length(v_clean_phone) < 7 then
    raise exception 'Invalid phone number';
  end if;
  if v_clean_name is null then
    raise exception 'Client name is required';
  end if;
  if p_start_time <= now() then
    raise exception 'Start time must be in the future';
  end if;
  select b.id into v_business_id
  from public.businesses b
  where b.slug = p_slug and b.active = true;
  if v_business_id is null then raise exception 'Business not found'; end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = p_employee_id
      and p.business_id = v_business_id
      and p.active = true
      and p.role = 'empleado'
  ) then raise exception 'Employee not available'; end if;
  select s.duration_minutes into v_duration
  from public.services s
  join public.employee_services es
    on es.service_id = s.id and es.employee_id = p_employee_id
  where s.id = p_service_id
    and s.business_id = v_business_id
    and s.active = true;
  if v_duration is null then raise exception 'Service not available for this employee'; end if;
  v_end_time := p_start_time + make_interval(mins => v_duration);
  if exists (
    select 1 from public.appointments a
    where a.employee_id = p_employee_id
      and a.status in ('pending', 'confirmed', 'completed')
      and tstzrange(a.start_time, a.end_time, '[)')
          && tstzrange(p_start_time, v_end_time, '[)')
  ) then raise exception 'Slot is no longer available'; end if;

  insert into public.clients (business_id, full_name, phone, email)
  values (v_business_id, v_clean_name, v_clean_phone, nullif(trim(p_client_email), ''))
  on conflict (business_id, phone) do update
    set full_name = excluded.full_name,
        email     = coalesce(excluded.email, public.clients.email),
        updated_at = now()
  returning id into v_client_id;

  insert into public.appointments (
    business_id, client_id, employee_id, service_id,
    start_time, end_time, status, payment_status,
    internal_notes, source
  )
  values (
    v_business_id, v_client_id, p_employee_id, p_service_id,
    p_start_time, v_end_time, 'pending', 'unpaid',
    nullif(trim(p_client_notes), ''), 'public'
  )
  returning id into v_appt_id;

  return query
  select v_appt_id, p_start_time, v_end_time, 'pending'::appointment_status;
end;
$$;

-- 4.7 Core business functions

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
security invoker
set search_path = public, pg_temp
as $$
declare
  v_trunc text;
  v_tz    text;
begin
  if not public.is_staff_of(p_business_id) then
    raise exception 'Not authorized';
  end if;
  if p_period not in ('day', 'week', 'month') then
    raise exception 'p_period must be day|week|month';
  end if;
  v_trunc := p_period;
  select b.timezone into v_tz from public.businesses b where b.id = p_business_id;
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

create or replace function public.record_payment(
  p_appointment_id uuid,
  p_amount         numeric,
  p_method         payment_method default 'cash',
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
  v_appt               public.appointments;
  v_service            public.services;
  v_effective_price    numeric(12, 2);
  v_local_pct          numeric(5, 2);
  v_employee_pct       numeric(5, 2);
  v_assistant_pct      numeric(5, 2);
  v_local_amount       numeric(12, 2);
  v_employee_amount    numeric(12, 2);
  v_assistant_amount   numeric(12, 2);
  v_tx_id              uuid;
  v_paid_so_far        numeric(12, 2);
  v_exchange_rate      numeric(12, 4);
begin
  select * into v_appt from public.appointments where id = p_appointment_id;
  if v_appt.id is null then raise exception 'Appointment not found'; end if;
  if not public.is_admin_of(v_appt.business_id) then raise exception 'Not authorized'; end if;
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;

  select * into v_service from public.services where id = v_appt.service_id;
  v_effective_price := coalesce(v_appt.price_override, v_service.price);

  v_assistant_pct   := coalesce(v_appt.assistant_percentage, 0);
  v_employee_pct    := coalesce(v_appt.employee_percentage_override, 100 - v_service.local_percentage);
  v_local_pct       := 100 - v_employee_pct - v_assistant_pct;

  v_assistant_amount := round(p_amount * v_assistant_pct / 100, 2);
  v_employee_amount  := round(p_amount * v_employee_pct / 100, 2);
  v_local_amount     := round(p_amount - v_employee_amount - v_assistant_amount, 2);

  v_exchange_rate := coalesce(p_exchange_rate,
    (select ves_exchange_rate from public.businesses where id = v_appt.business_id));

  insert into public.transactions (
    business_id, appointment_id,
    total_amount, local_amount, employee_amount, assistant_amount,
    local_percentage, employee_percentage, assistant_percentage,
    method, exchange_rate_used, payments_breakdown,
    created_by, notes
  )
  values (
    v_appt.business_id, p_appointment_id,
    p_amount, v_local_amount, v_employee_amount, v_assistant_amount,
    v_local_pct, v_employee_pct, v_assistant_pct,
    p_method, v_exchange_rate, p_payments_breakdown,
    auth.uid(), p_notes
  )
  returning id into v_tx_id;

  select coalesce(sum(total_amount), 0) into v_paid_so_far
  from public.transactions
  where appointment_id = p_appointment_id;

  update public.appointments
  set payment_status = case
        when v_paid_so_far >= v_effective_price then 'paid'::payment_status
        when v_paid_so_far > 0                 then 'partial'::payment_status
        else 'unpaid'::payment_status
      end
  where id = p_appointment_id;

  return v_tx_id;
end;
$$;

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

create or replace function public.update_transaction(
  p_transaction_id uuid,
  p_amount         numeric default null,
  p_method         payment_method default null,
  p_notes          text default null,
  p_exchange_rate  numeric default null
)
returns void
language plpgsql
volatile
security invoker
set search_path = public, pg_temp
as $$
declare
  v_tx                public.transactions;
  v_local_amount      numeric(12, 2);
  v_employee_amount   numeric(12, 2);
  v_assistant_amount  numeric(12, 2);
  v_paid_so_far       numeric(12, 2);
  v_service           public.services;
  v_appt              public.appointments;
  v_new_amount        numeric(12, 2);
  v_effective_price   numeric(12, 2);
begin
  select * into v_tx from public.transactions where id = p_transaction_id;
  if v_tx.id is null then raise exception 'Transaction not found'; end if;
  if not public.is_admin_of(v_tx.business_id) then raise exception 'Not authorized'; end if;

  select * into v_appt from public.appointments where id = v_tx.appointment_id;

  v_new_amount := coalesce(p_amount, v_tx.total_amount);
  if v_new_amount <= 0 then raise exception 'Amount must be positive'; end if;

  if p_amount is not null and p_amount != v_tx.total_amount then
    v_local_amount     := round(v_new_amount * v_tx.local_percentage / 100, 2);
    v_employee_amount  := round(v_new_amount * v_tx.employee_percentage / 100, 2);
    v_assistant_amount := round(v_new_amount - v_local_amount - v_employee_amount, 2);
  else
    v_local_amount     := v_tx.local_amount;
    v_employee_amount  := v_tx.employee_amount;
    v_assistant_amount := v_tx.assistant_amount;
  end if;

  update public.transactions
  set total_amount       = v_new_amount,
      local_amount       = v_local_amount,
      employee_amount    = v_employee_amount,
      assistant_amount   = v_assistant_amount,
      method             = coalesce(p_method, method),
      notes              = coalesce(p_notes, notes),
      exchange_rate_used = coalesce(p_exchange_rate, exchange_rate_used)
  where id = p_transaction_id;

  select coalesce(sum(total_amount), 0) into v_paid_so_far
  from public.transactions
  where appointment_id = v_tx.appointment_id;

  select * into v_service from public.services where id = v_appt.service_id;
  v_effective_price := coalesce(v_appt.price_override, v_service.price);

  update public.appointments
  set payment_status = case
        when v_paid_so_far >= v_effective_price then 'paid'::payment_status
        when v_paid_so_far > 0                 then 'partial'::payment_status
        else 'unpaid'::payment_status
      end,
      status = case
        when v_paid_so_far >= v_effective_price then status
        when v_appt.status = 'completed' then 'confirmed'
        else v_appt.status
      end
  where id = v_tx.appointment_id;
end;
$$;

create or replace function public.delete_transaction(
  p_transaction_id uuid
)
returns void
language plpgsql
volatile
security invoker
set search_path = public, pg_temp
as $$
declare
  v_tx               public.transactions;
  v_paid_so_far      numeric(12, 2);
  v_service          public.services;
  v_appt             public.appointments;
  v_inventory_count  integer;
  v_effective_price  numeric(12, 2);
begin
  select * into v_tx from public.transactions where id = p_transaction_id;
  if v_tx.id is null then raise exception 'Transaction not found'; end if;
  if not public.is_admin_of(v_tx.business_id) then raise exception 'Not authorized'; end if;

  select * into v_appt from public.appointments where id = v_tx.appointment_id;

  select count(*) into v_inventory_count
  from public.transactions
  where appointment_id = v_tx.appointment_id;

  if v_inventory_count <= 1 then
    update public.inventory_stock s
    set quantity = s.quantity + abs(m.quantity),
        updated_at = now()
    from public.inventory_movements m
    where m.reference_type = 'appointment'
      and m.reference_id = v_tx.appointment_id
      and m.movement_type = 'sale'
      and s.product_id = m.product_id
      and s.variant_id is not distinct from m.variant_id
      and s.location_id = m.location_id;

    delete from public.inventory_movements
    where reference_type = 'appointment'
      and reference_id = v_tx.appointment_id;
  end if;

  delete from public.transactions where id = p_transaction_id;

  select coalesce(sum(total_amount), 0) into v_paid_so_far
  from public.transactions
  where appointment_id = v_tx.appointment_id;

  select * into v_service from public.services where id = v_appt.service_id;
  v_effective_price := coalesce(v_appt.price_override, v_service.price);

  update public.appointments
  set payment_status = case
        when v_paid_so_far >= v_effective_price then 'paid'::payment_status
        when v_paid_so_far > 0                 then 'partial'::payment_status
        else 'unpaid'::payment_status
      end,
      status = case
        when v_paid_so_far >= v_effective_price then v_appt.status
        when v_appt.status = 'completed' then 'confirmed'
        else v_appt.status
      end
  where id = v_tx.appointment_id;
end;
$$;

-- 4.8 Overlap check
create or replace function public.check_employee_overlap()
returns trigger
language plpgsql
as $$
begin
  if new.status not in ('pending', 'confirmed', 'completed') then
    return new;
  end if;
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

-- 4.9 Notification triggers
create or replace function public.fn_notify_new_appointment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.notifications (business_id, profile_id, type, title, message,
    appointment_id, client_name, client_phone, service_name, appointment_time)
  select
    new.business_id, new.employee_id, 'new_appointment',
    'Nueva cita agendada',
    format('%s — %s', c.full_name, s.name),
    new.id, c.full_name, c.phone, s.name, new.start_time
  from public.clients c, public.services s
  where c.id = new.client_id and s.id = new.service_id;

  if new.assistant_employee_id is not null then
    insert into public.notifications (business_id, profile_id, type, title, message,
      appointment_id, client_name, client_phone, service_name, appointment_time)
    select
      new.business_id, new.assistant_employee_id, 'new_appointment',
      'Nueva cita como asistente',
      format('%s — %s (asistente)', c.full_name, s.name),
      new.id, c.full_name, c.phone, s.name, new.start_time
    from public.clients c, public.services s
    where c.id = new.client_id and s.id = new.service_id;
  end if;

  return new;
end;
$$;

create or replace function public.fn_notify_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  status_label text;
begin
  if old.status is distinct from new.status
     and new.status in ('confirmed', 'cancelled') then
    status_label := case new.status
      when 'confirmed' then 'confirmada'
      when 'cancelled' then 'cancelada'
    end;
    insert into public.notifications (business_id, profile_id, type, title, message,
      appointment_id, client_name, client_phone, service_name, appointment_time)
    select
      new.business_id, new.employee_id, 'status_change',
      'Cita ' || status_label,
      format('Tu cita con %s ha sido %s', c.full_name, status_label),
      new.id, c.full_name, c.phone, s.name, new.start_time
    from public.clients c, public.services s
    where c.id = new.client_id and s.id = new.service_id;
  end if;
  return new;
end;
$$;

-- 4.10 create_default_branch — auto-crear sucursal al crear negocio
create or replace function public.create_default_branch()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.branches (business_id, name, is_default)
  values (new.id, new.name || ' — Principal', true)
  on conflict (business_id, name) do nothing;
  return new;
end;
$$;

-- 4.11 get_low_stock_products — usado por edge function de reminders
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

-- =============================================================================
-- 5. TRIGGERS
-- =============================================================================

-- 5.1 updated_at triggers
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'businesses', 'profiles', 'services',
    'clients', 'appointments', 'employee_absences',
    'expenses', 'service_categories', 'service_variants',
    'product_categories', 'products', 'product_variants',
    'inventory_locations', 'inventory_stock',
    'branches', 'suppliers', 'supplier_payments',
    'employee_payments'
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

-- 5.2 Auth trigger: auto-crear profile al insertar en auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5.3 Auth trigger: sincronizar email al cambiar en auth.users
drop trigger if exists on_auth_user_email_change on auth.users;
create trigger on_auth_user_email_change
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute procedure public.sync_profile_email();

-- 5.4 Overlap check trigger
drop trigger if exists check_employee_overlap_trigger on public.appointments;
create trigger check_employee_overlap_trigger
  before insert or update on public.appointments
  for each row execute function public.check_employee_overlap();

-- 5.5 Notification triggers
drop trigger if exists trg_new_appointment_notification on public.appointments;
create trigger trg_new_appointment_notification
  after insert on public.appointments
  for each row execute function fn_notify_new_appointment();

drop trigger if exists trg_status_change_notification on public.appointments;
create trigger trg_status_change_notification
  after update on public.appointments
  for each row execute function fn_notify_status_change();

-- 5.6 Default branch trigger (solo si tabla branches existe)
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'branches') then
    if not exists (select 1 from pg_trigger where tgname = 'trg_create_default_branch') then
      create trigger trg_create_default_branch
        after insert on public.businesses
        for each row execute function public.create_default_branch();
    end if;
  end if;
end;
$$;

-- =============================================================================
-- 6. ROW LEVEL SECURITY
-- =============================================================================

alter table public.businesses              enable row level security;
alter table public.profiles                enable row level security;
alter table public.employee_schedules      enable row level security;
alter table public.services                enable row level security;
alter table public.employee_services       enable row level security;
alter table public.clients                 enable row level security;
alter table public.appointments            enable row level security;
alter table public.transactions            enable row level security;
alter table public.expenses                enable row level security;
alter table public.employee_absences       enable row level security;
alter table public.service_categories      enable row level security;
alter table public.service_variants        enable row level security;
alter table public.product_categories      enable row level security;
alter table public.products                enable row level security;
alter table public.product_variants        enable row level security;
alter table public.inventory_locations     enable row level security;
alter table public.inventory_stock         enable row level security;
alter table public.inventory_movements     enable row level security;
alter table public.employee_payments       enable row level security;
alter table public.suppliers               enable row level security;
alter table public.supplier_payments       enable row level security;
alter table public.notifications           enable row level security;
alter table public.client_preferred_services enable row level security;
alter table public.branches                enable row level security;
alter table public.appointment_services    enable row level security;

-- =============================================================================
-- 7. RLS POLICIES
-- =============================================================================

-- 7.1 businesses
drop policy if exists businesses_select on public.businesses;
create policy businesses_select on public.businesses
  for select to authenticated
  using (public.is_superadmin() or id = public.auth_business_id());

drop policy if exists businesses_insert on public.businesses;
create policy businesses_insert on public.businesses
  for insert to authenticated
  with check (public.is_superadmin());

drop policy if exists businesses_update on public.businesses;
create policy businesses_update on public.businesses
  for update to authenticated
  using (public.is_admin_of(id))
  with check (public.is_admin_of(id));

drop policy if exists businesses_delete on public.businesses;
create policy businesses_delete on public.businesses
  for delete to authenticated
  using (public.is_superadmin());

-- 7.2 profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    public.is_superadmin()
    or id = auth.uid()
    or business_id = public.auth_business_id()
  );

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (
    public.is_superadmin()
    or (
      public.auth_role() = 'admin'
      and business_id = public.auth_business_id()
      and role <> 'superadmin'
    )
  );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (
    public.is_superadmin()
    or id = auth.uid()
    or (public.auth_role() = 'admin' and business_id = public.auth_business_id())
  )
  with check (
    public.is_superadmin()
    or id = auth.uid()
    or (public.auth_role() = 'admin' and business_id = public.auth_business_id())
  );

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete to authenticated
  using (
    public.is_superadmin()
    or (public.auth_role() = 'admin' and business_id = public.auth_business_id())
  );

-- 7.3 employee_schedules
drop policy if exists employee_schedules_select on public.employee_schedules;
create policy employee_schedules_select on public.employee_schedules
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = employee_schedules.employee_id
        and (public.is_superadmin() or p.business_id = public.auth_business_id())
    )
  );

drop policy if exists employee_schedules_write on public.employee_schedules;
create policy employee_schedules_write on public.employee_schedules
  for all to authenticated
  using (
    employee_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = employee_schedules.employee_id
        and public.is_admin_of(p.business_id)
    )
  )
  with check (
    employee_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = employee_schedules.employee_id
        and public.is_admin_of(p.business_id)
    )
  );

-- 7.4 services
drop policy if exists services_select on public.services;
create policy services_select on public.services
  for select to authenticated
  using (public.is_staff_of(business_id));

drop policy if exists services_write on public.services;
create policy services_write on public.services
  for all to authenticated
  using (public.is_admin_of(business_id))
  with check (public.is_admin_of(business_id));

-- 7.5 employee_services
drop policy if exists employee_services_select on public.employee_services;
create policy employee_services_select on public.employee_services
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = employee_services.employee_id
        and (public.is_superadmin() or p.business_id = public.auth_business_id())
    )
  );

drop policy if exists employee_services_write on public.employee_services;
create policy employee_services_write on public.employee_services
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = employee_services.employee_id
        and public.is_admin_of(p.business_id)
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = employee_services.employee_id
        and public.is_admin_of(p.business_id)
    )
  );

-- 7.6 clients
drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
  for select to authenticated
  using (public.is_staff_of(business_id));

drop policy if exists clients_insert on public.clients;
create policy clients_insert on public.clients
  for insert to authenticated
  with check (public.is_staff_of(business_id));

drop policy if exists clients_update on public.clients;
create policy clients_update on public.clients
  for update to authenticated
  using (public.is_staff_of(business_id))
  with check (public.is_staff_of(business_id));

drop policy if exists clients_delete on public.clients;
create policy clients_delete on public.clients
  for delete to authenticated
  using (public.is_admin_of(business_id));

-- 7.7 appointments
drop policy if exists appointments_select on public.appointments;
create policy appointments_select on public.appointments
  for select to authenticated
  using (
    public.is_superadmin()
    or public.is_admin_of(business_id)
    or (employee_id = auth.uid())
  );

drop policy if exists appointments_insert on public.appointments;
create policy appointments_insert on public.appointments
  for insert to authenticated
  with check (public.is_staff_of(business_id));

drop policy if exists appointments_update on public.appointments;
create policy appointments_update on public.appointments
  for update to authenticated
  using (
    public.is_admin_of(business_id)
    or (employee_id = auth.uid() and public.is_staff_of(business_id))
  )
  with check (
    public.is_admin_of(business_id)
    or (employee_id = auth.uid() and public.is_staff_of(business_id))
  );

drop policy if exists appointments_delete on public.appointments;
create policy appointments_delete on public.appointments
  for delete to authenticated
  using (public.is_admin_of(business_id));

-- 7.8 transactions
drop policy if exists transactions_select on public.transactions;
create policy transactions_select on public.transactions
  for select to authenticated
  using (
    public.is_superadmin()
    or public.is_admin_of(business_id)
    or exists (
      select 1 from public.appointments a
      where a.id = transactions.appointment_id
        and a.employee_id = auth.uid()
    )
  );

drop policy if exists transactions_insert on public.transactions;
create policy transactions_insert on public.transactions
  for insert to authenticated
  with check (public.is_admin_of(business_id));

drop policy if exists transactions_update on public.transactions;
create policy transactions_update on public.transactions
  for update to authenticated
  using (public.is_admin_of(business_id))
  with check (public.is_admin_of(business_id));

drop policy if exists transactions_delete on public.transactions;
create policy transactions_delete on public.transactions
  for delete to authenticated
  using (public.is_superadmin() or public.is_admin_of(business_id));

-- 7.9 expenses
drop policy if exists expenses_select on public.expenses;
create policy expenses_select on public.expenses
  for select to authenticated
  using (public.is_staff_of(business_id));

drop policy if exists expenses_insert on public.expenses;
create policy expenses_insert on public.expenses
  for insert to authenticated
  with check (public.is_admin_of(business_id));

drop policy if exists expenses_update on public.expenses;
create policy expenses_update on public.expenses
  for update to authenticated
  using (public.is_admin_of(business_id))
  with check (public.is_admin_of(business_id));

drop policy if exists expenses_delete on public.expenses;
create policy expenses_delete on public.expenses
  for delete to authenticated
  using (public.is_admin_of(business_id));

-- 7.10 employee_absences
drop policy if exists employee_absences_select on public.employee_absences;
create policy employee_absences_select on public.employee_absences
  for select to authenticated
  using (
    public.is_admin_of(business_id)
    or (employee_id = auth.uid() and public.is_staff_of(business_id))
  );

drop policy if exists employee_absences_insert on public.employee_absences;
create policy employee_absences_insert on public.employee_absences
  for insert to authenticated
  with check (
    public.is_admin_of(business_id)
    or (employee_id = auth.uid() and public.is_staff_of(business_id))
  );

drop policy if exists employee_absences_update on public.employee_absences;
create policy employee_absences_update on public.employee_absences
  for update to authenticated
  using (
    public.is_admin_of(business_id)
    or (employee_id = auth.uid() and public.is_staff_of(business_id))
  )
  with check (
    public.is_admin_of(business_id)
    or (employee_id = auth.uid() and public.is_staff_of(business_id))
  );

drop policy if exists employee_absences_delete on public.employee_absences;
create policy employee_absences_delete on public.employee_absences
  for delete to authenticated
  using (public.is_admin_of(business_id));

-- 7.11 service_categories
drop policy if exists service_categories_select on public.service_categories;
create policy service_categories_select on public.service_categories
  for select to authenticated
  using (public.is_staff_of(business_id));

drop policy if exists service_categories_write on public.service_categories;
create policy service_categories_write on public.service_categories
  for all to authenticated
  using (public.is_admin_of(business_id))
  with check (public.is_admin_of(business_id));

-- 7.12 service_variants
drop policy if exists service_variants_select on public.service_variants;
create policy service_variants_select on public.service_variants
  for select to authenticated
  using (public.is_staff_of(business_id));

drop policy if exists service_variants_write on public.service_variants;
create policy service_variants_write on public.service_variants
  for all to authenticated
  using (public.is_admin_of(business_id))
  with check (public.is_admin_of(business_id));

-- 7.13 product_categories
drop policy if exists product_categories_select on public.product_categories;
create policy product_categories_select on public.product_categories
  for select to authenticated
  using (public.is_staff_of(business_id));

drop policy if exists product_categories_write on public.product_categories;
create policy product_categories_write on public.product_categories
  for all to authenticated
  using (public.is_admin_of(business_id))
  with check (public.is_admin_of(business_id));

-- 7.14 products
drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select to authenticated
  using (public.is_staff_of(business_id));

drop policy if exists products_write on public.products;
create policy products_write on public.products
  for all to authenticated
  using (public.is_admin_of(business_id))
  with check (public.is_admin_of(business_id));

-- 7.15 product_variants
drop policy if exists product_variants_select on public.product_variants;
create policy product_variants_select on public.product_variants
  for select to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and public.is_staff_of(p.business_id)
    )
  );

drop policy if exists product_variants_write on public.product_variants;
create policy product_variants_write on public.product_variants
  for all to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and public.is_admin_of(p.business_id)
    )
  )
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and public.is_admin_of(p.business_id)
    )
  );

-- 7.16 inventory_locations
drop policy if exists inventory_locations_select on public.inventory_locations;
create policy inventory_locations_select on public.inventory_locations
  for select to authenticated
  using (public.is_staff_of(business_id));

drop policy if exists inventory_locations_write on public.inventory_locations;
create policy inventory_locations_write on public.inventory_locations
  for all to authenticated
  using (public.is_admin_of(business_id))
  with check (public.is_admin_of(business_id));

-- 7.17 inventory_stock
drop policy if exists inventory_stock_select on public.inventory_stock;
create policy inventory_stock_select on public.inventory_stock
  for select to authenticated
  using (public.is_staff_of(business_id));

drop policy if exists inventory_stock_write on public.inventory_stock;
create policy inventory_stock_write on public.inventory_stock
  for all to authenticated
  using (public.is_admin_of(business_id))
  with check (public.is_admin_of(business_id));

-- 7.18 inventory_movements
drop policy if exists inventory_movements_select on public.inventory_movements;
create policy inventory_movements_select on public.inventory_movements
  for select to authenticated
  using (public.is_staff_of(business_id));

drop policy if exists inventory_movements_write on public.inventory_movements;
create policy inventory_movements_write on public.inventory_movements
  for all to authenticated
  using (public.is_admin_of(business_id))
  with check (public.is_admin_of(business_id));

-- 7.19 employee_payments
drop policy if exists employee_payments_select on public.employee_payments;
create policy employee_payments_select on public.employee_payments
  for select to authenticated
  using (public.is_admin_of(business_id));

drop policy if exists employee_payments_insert on public.employee_payments;
create policy employee_payments_insert on public.employee_payments
  for insert to authenticated
  with check (public.is_admin_of(business_id));

drop policy if exists employee_payments_update on public.employee_payments;
create policy employee_payments_update on public.employee_payments
  for update to authenticated
  using (public.is_admin_of(business_id))
  with check (public.is_admin_of(business_id));

drop policy if exists employee_payments_delete on public.employee_payments;
create policy employee_payments_delete on public.employee_payments
  for delete to authenticated
  using (public.is_admin_of(business_id));

-- 7.20 suppliers
drop policy if exists suppliers_select on public.suppliers;
create policy suppliers_select on public.suppliers
  for select to authenticated
  using (public.is_admin_of(business_id));

drop policy if exists suppliers_insert on public.suppliers;
create policy suppliers_insert on public.suppliers
  for insert to authenticated
  with check (public.is_admin_of(business_id));

drop policy if exists suppliers_update on public.suppliers;
create policy suppliers_update on public.suppliers
  for update to authenticated
  using (public.is_admin_of(business_id))
  with check (public.is_admin_of(business_id));

drop policy if exists suppliers_delete on public.suppliers;
create policy suppliers_delete on public.suppliers
  for delete to authenticated
  using (public.is_admin_of(business_id));

-- 7.21 supplier_payments
drop policy if exists supplier_payments_select on public.supplier_payments;
create policy supplier_payments_select on public.supplier_payments
  for select to authenticated
  using (public.is_admin_of(business_id));

drop policy if exists supplier_payments_insert on public.supplier_payments;
create policy supplier_payments_insert on public.supplier_payments
  for insert to authenticated
  with check (public.is_admin_of(business_id));

drop policy if exists supplier_payments_update on public.supplier_payments;
create policy supplier_payments_update on public.supplier_payments
  for update to authenticated
  using (public.is_admin_of(business_id))
  with check (public.is_admin_of(business_id));

drop policy if exists supplier_payments_delete on public.supplier_payments;
create policy supplier_payments_delete on public.supplier_payments
  for delete to authenticated
  using (public.is_admin_of(business_id));

-- 7.22 notifications
drop policy if exists "Usuarios ven sus propias notificaciones" on public.notifications;
create policy "Usuarios ven sus propias notificaciones"
  on public.notifications for select
  using (profile_id = auth.uid());

drop policy if exists "Usuarios actualizan sus propias notificaciones" on public.notifications;
create policy "Usuarios actualizan sus propias notificaciones"
  on public.notifications for update
  using (profile_id = auth.uid());

drop policy if exists "notifications_insert_admin" on public.notifications;
drop policy if exists "Triggers y edge functions pueden insertar" on public.notifications;
create policy "notifications_insert_admin"
  on public.notifications for insert
  with check (public.is_admin_of(business_id));

-- 7.23 client_preferred_services
drop policy if exists client_preferred_services_select on public.client_preferred_services;
create policy client_preferred_services_select on public.client_preferred_services
  for select to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_preferred_services.client_id
        and public.is_staff_of(c.business_id)
    )
  );

drop policy if exists client_preferred_services_write on public.client_preferred_services;
create policy client_preferred_services_write on public.client_preferred_services
  for all to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_preferred_services.client_id
        and public.is_staff_of(c.business_id)
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      join public.services s on s.id = client_preferred_services.service_id
      where c.id = client_preferred_services.client_id
        and c.business_id = s.business_id
        and public.is_staff_of(c.business_id)
    )
  );

-- 7.24 branches
drop policy if exists branches_select on public.branches;
create policy branches_select on public.branches
  for select to authenticated
  using (public.is_admin_of(business_id) or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.business_id = branches.business_id
  ));

drop policy if exists branches_insert on public.branches;
create policy branches_insert on public.branches
  for insert to authenticated
  with check (public.is_admin_of(business_id));

drop policy if exists branches_update on public.branches;
create policy branches_update on public.branches
  for update to authenticated
  using (public.is_admin_of(business_id));

drop policy if exists branches_delete on public.branches;
create policy branches_delete on public.branches
  for delete to authenticated
  using (public.is_admin_of(business_id));

-- 7.25 appointment_services
drop policy if exists "appointment_services_admin" on public.appointment_services;
create policy "appointment_services_admin" on public.appointment_services
  for all to authenticated
  using (public.is_admin_of(
    (select business_id from public.appointments where id = appointment_id)
  ));

drop policy if exists "appointment_services_employee" on public.appointment_services;
create policy "appointment_services_employee" on public.appointment_services
  for select to authenticated
  using (
    exists (
      select 1 from public.appointments a
      join public.profiles p on p.business_id = a.business_id
      where a.id = appointment_id
        and p.id = auth.uid()
        and p.role = 'empleado'
    )
  );

-- =============================================================================
-- 8. ÍNDICES ADICIONALES (los que no son PK ni unique)
-- =============================================================================

-- businesses
create index if not exists businesses_slug_idx on public.businesses(slug);
create index if not exists idx_businesses_active on public.businesses(id) where deleted_at is null;

-- profiles
create index if not exists profiles_business_id_idx on public.profiles(business_id);
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_email_idx on public.profiles(email);

-- branches
create index if not exists branches_business_idx on public.branches(business_id);

-- services
create index if not exists services_business_idx on public.services(business_id);
create index if not exists services_business_category_active_idx on public.services(business_id, category, active);
create index if not exists services_service_category_idx on public.services(service_category_id);
create index if not exists services_branch_idx on public.services(branch_id);

-- service_categories
create index if not exists service_categories_business_idx on public.service_categories(business_id);
create index if not exists service_categories_parent_idx on public.service_categories(parent_id);

-- service_variants
create index if not exists service_variants_service_idx on public.service_variants(service_id);
create index if not exists service_variants_business_idx on public.service_variants(business_id);

-- employee_services
create index if not exists employee_services_service_idx on public.employee_services(service_id);

-- employee_schedules
create index if not exists employee_schedules_employee_idx on public.employee_schedules(employee_id, weekday);

-- clients
create index if not exists clients_business_idx on public.clients(business_id);
create index if not exists clients_phone_idx on public.clients(business_id, phone);
create index if not exists clients_branch_idx on public.clients(branch_id);

-- client_preferred_services
create index if not exists client_preferred_services_service_idx on public.client_preferred_services(service_id);
create index if not exists client_preferred_services_branch_idx on public.client_preferred_services(branch_id);

-- appointments
create index if not exists appointments_business_start_idx on public.appointments(business_id, start_time);
create index if not exists appointments_employee_start_idx on public.appointments(employee_id, start_time);
create index if not exists appointments_client_start_idx on public.appointments(client_id, start_time desc);
create index if not exists appointments_status_idx on public.appointments(business_id, status);
create index if not exists appointments_reminder_idx on public.appointments(start_time) where reminder_sent_at is null and status in ('pending', 'confirmed');
create index if not exists appointments_group_id_idx on public.appointments(group_id);

-- appointment_services
create index if not exists appt_svc_appointment_idx on public.appointment_services(appointment_id);
create index if not exists appt_svc_employee_idx on public.appointment_services(employee_id);

-- transactions
create index if not exists transactions_business_paid_idx on public.transactions(business_id, paid_at desc);
create index if not exists transactions_appointment_idx on public.transactions(appointment_id);

-- expenses
create index if not exists expenses_business_date_idx on public.expenses(business_id, expense_date desc);

-- employee_absences
create index if not exists employee_absences_business_idx on public.employee_absences(business_id);
create index if not exists employee_absences_employee_range_idx on public.employee_absences(employee_id, starts_at, ends_at);

-- product_categories
create index if not exists product_categories_business_idx on public.product_categories(business_id);
create index if not exists product_categories_parent_idx on public.product_categories(parent_id);
create index if not exists product_categories_branch_idx on public.product_categories(branch_id);

-- products
create index if not exists products_business_idx on public.products(business_id);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_active_idx on public.products(business_id, active);
create index if not exists products_sellable_idx on public.products(business_id, is_sellable) where is_sellable = true;
create index if not exists products_branch_idx on public.products(branch_id);

-- product_variants
create index if not exists product_variants_product_idx on public.product_variants(product_id);
create index if not exists product_variants_branch_idx on public.product_variants(branch_id);

-- inventory_locations
create index if not exists inventory_locations_business_idx on public.inventory_locations(business_id);
create index if not exists inventory_locations_branch_idx on public.inventory_locations(branch_id);

-- inventory_stock
create unique index if not exists inventory_stock_unique_idx on public.inventory_stock(location_id, product_id, variant_id);
create index if not exists inventory_stock_business_idx on public.inventory_stock(business_id);

-- inventory_movements
create index if not exists inventory_movements_business_idx on public.inventory_movements(business_id, created_at desc);
create index if not exists inventory_movements_product_idx on public.inventory_movements(product_id);

-- employee_payments
create index if not exists idx_employee_payments_business on public.employee_payments(business_id);
create index if not exists idx_employee_payments_employee on public.employee_payments(employee_id);
create index if not exists idx_employee_payments_date on public.employee_payments(payment_date);
create index if not exists employee_payments_branch_idx on public.employee_payments(branch_id);

-- suppliers
create index if not exists idx_suppliers_business on public.suppliers(business_id);
create index if not exists idx_suppliers_active on public.suppliers(business_id, active);
create index if not exists suppliers_branch_idx on public.suppliers(branch_id);

-- supplier_payments
create index if not exists idx_supplier_payments_business on public.supplier_payments(business_id);
create index if not exists idx_supplier_payments_supplier on public.supplier_payments(supplier_id);
create index if not exists idx_supplier_payments_date on public.supplier_payments(payment_date);
create index if not exists supplier_payments_branch_idx on public.supplier_payments(branch_id);

-- notifications
create index if not exists idx_notifications_unread on public.notifications(profile_id, is_read, created_at desc) where is_read = false;
create index if not exists idx_notifications_business on public.notifications(business_id);

-- =============================================================================
-- 9. GRANTS (funciones)
-- =============================================================================

-- Auth helpers
grant execute on function public.auth_role()           to authenticated;
grant execute on function public.auth_business_id()    to authenticated;
grant execute on function public.is_superadmin()       to authenticated;
grant execute on function public.is_admin_of(uuid)     to authenticated;
grant execute on function public.is_staff_of(uuid)     to authenticated;

-- Public booking functions (anon + authenticated)
grant execute on function public.public_business_info(text)                       to anon, authenticated;
grant execute on function public.public_list_services(text)                       to anon, authenticated;
grant execute on function public.public_list_employees_for_service(text, uuid)    to anon, authenticated;
grant execute on function public.public_get_available_slots(text, uuid, uuid, date, date, integer) to anon, authenticated;
grant execute on function public.public_book_appointment(text, uuid, uuid, timestamptz, text, text, text, text) to anon, authenticated;

-- Internal business functions (authenticated)
grant execute on function public.financial_summary(uuid, date, date, text, uuid, uuid) to authenticated;
grant execute on function public.record_payment(uuid, numeric, payment_method, text, numeric, jsonb) to authenticated;
grant execute on function public.record_sale(uuid, numeric, payment_method, jsonb, text, numeric, jsonb) to authenticated;
grant execute on function public.update_transaction(uuid, numeric, payment_method, text, numeric) to authenticated;
grant execute on function public.delete_transaction(uuid) to authenticated;

-- =============================================================================
-- FIN DEL SCRIPT
-- =============================================================================
