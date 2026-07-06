-- =============================================================================
-- Sistema de Salones — RLS (Row Level Security)
-- =============================================================================
-- Estrategia:
--   1. Helpers SECURITY DEFINER que leen `profiles` saltando RLS (evita
--      recursión cuando una policy de profiles necesita consultar profiles).
--   2. Policies por tabla basadas en `business_id` del perfil del usuario.
--   3. Superadmin (business_id null) tiene bypass amplio.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER, leen profiles sin RLS)
-- -----------------------------------------------------------------------------
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

grant execute on function public.auth_role()           to authenticated;
grant execute on function public.auth_business_id()    to authenticated;
grant execute on function public.is_superadmin()       to authenticated;
grant execute on function public.is_admin_of(uuid)     to authenticated;
grant execute on function public.is_staff_of(uuid)     to authenticated;

-- -----------------------------------------------------------------------------
-- Enable RLS en todas las tablas
-- -----------------------------------------------------------------------------
alter table public.businesses          enable row level security;
alter table public.profiles            enable row level security;
alter table public.employee_schedules  enable row level security;
alter table public.services            enable row level security;
alter table public.employee_services   enable row level security;
alter table public.clients             enable row level security;
alter table public.appointments        enable row level security;
alter table public.transactions        enable row level security;

-- -----------------------------------------------------------------------------
-- businesses
-- -----------------------------------------------------------------------------
drop policy if exists businesses_select on public.businesses;
create policy businesses_select on public.businesses
  for select to authenticated
  using (
    public.is_superadmin()
    or id = public.auth_business_id()
  );

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

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    public.is_superadmin()
    or id = auth.uid()
    or business_id = public.auth_business_id()
  );

-- Inserción: superadmin libre; admin solo dentro de su negocio y rol != superadmin.
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

-- Update: el usuario puede actualizar su propio perfil (campos básicos);
-- admin del negocio puede actualizar a su personal; superadmin todo.
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

-- -----------------------------------------------------------------------------
-- employee_schedules
-- -----------------------------------------------------------------------------
-- Lectura: cualquier staff del mismo negocio que la empleada.
drop policy if exists employee_schedules_select on public.employee_schedules;
create policy employee_schedules_select on public.employee_schedules
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = employee_schedules.employee_id
        and (
          public.is_superadmin()
          or p.business_id = public.auth_business_id()
        )
    )
  );

-- Mutación: admin del negocio o la propia empleada.
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

-- -----------------------------------------------------------------------------
-- services
-- -----------------------------------------------------------------------------
drop policy if exists services_select on public.services;
create policy services_select on public.services
  for select to authenticated
  using (public.is_staff_of(business_id));

drop policy if exists services_write on public.services;
create policy services_write on public.services
  for all to authenticated
  using (public.is_admin_of(business_id))
  with check (public.is_admin_of(business_id));

-- -----------------------------------------------------------------------------
-- employee_services
-- -----------------------------------------------------------------------------
drop policy if exists employee_services_select on public.employee_services;
create policy employee_services_select on public.employee_services
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = employee_services.employee_id
        and (
          public.is_superadmin()
          or p.business_id = public.auth_business_id()
        )
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

-- -----------------------------------------------------------------------------
-- clients
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- appointments
-- -----------------------------------------------------------------------------
-- Empleada ve sus propias citas; admin ve todas del negocio; superadmin todas.
drop policy if exists appointments_select on public.appointments;
create policy appointments_select on public.appointments
  for select to authenticated
  using (
    public.is_superadmin()
    or public.is_admin_of(business_id)
    or (employee_id = auth.uid())
  );

-- Cualquier staff del negocio puede crear citas (la empleada puede agendar
-- para sí misma o admins agendan).
drop policy if exists appointments_insert on public.appointments;
create policy appointments_insert on public.appointments
  for insert to authenticated
  with check (public.is_staff_of(business_id));

-- Update: empleada en sus propias citas; admin en todas del negocio.
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

-- -----------------------------------------------------------------------------
-- transactions
-- -----------------------------------------------------------------------------
-- Empleada solo ve transacciones de sus propias citas; admin todas del negocio.
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

-- Crear/actualizar pagos: solo admin (control financiero).
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
