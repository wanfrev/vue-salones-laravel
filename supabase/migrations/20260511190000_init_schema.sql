-- =============================================================================
-- Sistema de Salones — Esquema inicial
-- =============================================================================
-- Multi-tenant (cada fila vive bajo un `business_id`).
-- Auth la maneja Supabase Auth (auth.users). La tabla `profiles` extiende esa
-- identidad con role + business_id + datos del salón.
-- =============================================================================

-- Necesarios para uuid + exclusion constraints (anti-solape de citas).
create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- -----------------------------------------------------------------------------
-- ENUM-like CHECK domains (usamos text + CHECK para poder evolucionar sin pain)
-- -----------------------------------------------------------------------------

-- Roles del sistema
do $$ begin
  create type app_role as enum ('superadmin', 'admin', 'empleado');
exception when duplicate_object then null; end $$;

-- Estados de cita
do $$ begin
  create type appointment_status as enum (
    'pending',    -- creada por cliente público, esperando confirmación
    'confirmed',  -- confirmada por el salón
    'completed',  -- servicio terminado
    'cancelled',  -- cancelada
    'no_show'     -- el cliente no llegó
  );
exception when duplicate_object then null; end $$;

-- Estado de pago de la cita
do $$ begin
  create type payment_status as enum ('unpaid', 'partial', 'paid');
exception when duplicate_object then null; end $$;

-- Método de pago
do $$ begin
  create type payment_method as enum ('cash', 'card', 'transfer', 'other');
exception when duplicate_object then null; end $$;

-- Origen de la cita (interno vs link público)
do $$ begin
  create type appointment_source as enum ('internal', 'public');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- businesses : un salón (multi-tenant)
-- -----------------------------------------------------------------------------
create table if not exists public.businesses (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,          -- usado en URL pública /book/:slug
  phone         text,
  address       text,
  timezone      text not null default 'America/Santo_Domingo',
  currency      text not null default 'USD',
  primary_color text,                          -- color de marca (hex)
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists businesses_slug_idx on public.businesses(slug);

-- -----------------------------------------------------------------------------
-- profiles : extensión de auth.users con role + tenant
-- -----------------------------------------------------------------------------
-- Nota: superadmin puede tener business_id NULL (acceso global).
-- admin y empleado SIEMPRE deben tener business_id.
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  business_id  uuid references public.businesses(id) on delete cascade,
  full_name    text not null,
  role         app_role not null default 'empleado',
  phone        text,
  avatar_url   text,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint profiles_tenant_required
    check (role = 'superadmin' or business_id is not null)
);

create index if not exists profiles_business_id_idx on public.profiles(business_id);
create index if not exists profiles_role_idx on public.profiles(role);

-- -----------------------------------------------------------------------------
-- employee_schedules : horario laboral semanal por empleado
-- -----------------------------------------------------------------------------
-- weekday: 0 = domingo .. 6 = sábado (compatible con JS Date.getDay()).
-- Un empleado puede tener varios bloques por día (ej. 9-13 y 15-19).
create table if not exists public.employee_schedules (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references public.profiles(id) on delete cascade,
  weekday      smallint not null check (weekday between 0 and 6),
  start_time   time not null,
  end_time     time not null,
  created_at   timestamptz not null default now(),

  check (end_time > start_time)
);

create index if not exists employee_schedules_employee_idx
  on public.employee_schedules(employee_id, weekday);

-- -----------------------------------------------------------------------------
-- services : servicios que ofrece el salón
-- -----------------------------------------------------------------------------
-- local_percentage define el % que se queda el negocio. La empleada recibe
-- (100 - local_percentage). Snapshot en cada transacción para historial.
create table if not exists public.services (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses(id) on delete cascade,
  name              text not null,
  description       text,
  duration_minutes  integer not null check (duration_minutes > 0),
  price             numeric(12, 2) not null check (price >= 0),
  local_percentage  numeric(5, 2) not null default 50
                      check (local_percentage between 0 and 100),
  color             text,                 -- color para el calendario
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists services_business_idx on public.services(business_id);

-- -----------------------------------------------------------------------------
-- employee_services : M:N qué servicios ofrece cada empleada
-- -----------------------------------------------------------------------------
-- Permite mostrar al cliente solo las empleadas que hacen el servicio elegido.
create table if not exists public.employee_services (
  employee_id  uuid not null references public.profiles(id) on delete cascade,
  service_id   uuid not null references public.services(id) on delete cascade,
  primary key (employee_id, service_id)
);

create index if not exists employee_services_service_idx on public.employee_services(service_id);

-- -----------------------------------------------------------------------------
-- clients : clientes del salón
-- -----------------------------------------------------------------------------
-- phone es la clave práctica para evitar duplicados y enviar WhatsApp.
create table if not exists public.clients (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  full_name    text not null,
  phone        text not null,
  email        text,
  notes        text,                       -- notas generales del cliente
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (business_id, phone)
);

create index if not exists clients_business_idx on public.clients(business_id);
create index if not exists clients_phone_idx on public.clients(business_id, phone);

-- -----------------------------------------------------------------------------
-- appointments : la agenda
-- -----------------------------------------------------------------------------
-- service_notes guarda el detalle de lo realizado (historial del cliente).
-- exclusion constraint impide doble-booking de la misma empleada (excepto
-- citas canceladas / no_show).
create table if not exists public.appointments (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses(id) on delete cascade,
  client_id         uuid not null references public.clients(id) on delete restrict,
  employee_id       uuid not null references public.profiles(id) on delete restrict,
  service_id        uuid not null references public.services(id) on delete restrict,
  start_time        timestamptz not null,
  end_time          timestamptz not null,
  status            appointment_status not null default 'pending',
  payment_status    payment_status not null default 'unpaid',
  service_notes     text,                       -- detalle del servicio (historial)
  internal_notes    text,                       -- notas del personal (no visible al cliente)
  reminder_sent_at  timestamptz,                -- recordatorio WA enviado en
  source            appointment_source not null default 'internal',
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  check (end_time > start_time),

  -- Evita que la misma empleada tenga 2 citas activas que se solapen.
  constraint appointments_no_employee_overlap
    exclude using gist (
      employee_id with =,
      tstzrange(start_time, end_time, '[)') with &&
    )
    where (status in ('pending', 'confirmed', 'completed'))
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

-- -----------------------------------------------------------------------------
-- transactions : pagos
-- -----------------------------------------------------------------------------
-- Snapshot de los porcentajes al momento del pago (no se rompe si el servicio
-- cambia su % después). Una cita puede tener varios pagos (parciales).
create table if not exists public.transactions (
  id                   uuid primary key default gen_random_uuid(),
  business_id          uuid not null references public.businesses(id) on delete cascade,
  appointment_id       uuid not null references public.appointments(id) on delete restrict,
  total_amount         numeric(12, 2) not null check (total_amount >= 0),
  local_amount         numeric(12, 2) not null check (local_amount >= 0),
  employee_amount      numeric(12, 2) not null check (employee_amount >= 0),
  local_percentage     numeric(5, 2) not null check (local_percentage between 0 and 100),
  employee_percentage  numeric(5, 2) not null check (employee_percentage between 0 and 100),
  method               payment_method not null default 'cash',
  paid_at              timestamptz not null default now(),
  created_by           uuid references public.profiles(id) on delete set null,
  notes                text,
  created_at           timestamptz not null default now(),

  check (round(local_amount + employee_amount, 2) = round(total_amount, 2)),
  check (round(local_percentage + employee_percentage, 2) = 100)
);

create index if not exists transactions_business_paid_idx
  on public.transactions(business_id, paid_at desc);
create index if not exists transactions_appointment_idx
  on public.transactions(appointment_id);

-- -----------------------------------------------------------------------------
-- Trigger genérico para updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'businesses', 'profiles', 'services',
    'clients', 'appointments'
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
