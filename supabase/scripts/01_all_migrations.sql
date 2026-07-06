-- =============================================================================
-- MIGRACIÓN COMPLETA — Sistema de Salones (12 migrations en orden)
-- =============================================================================
-- EJECUTAR EN EL SQL EDITOR DE SUPABASE (una sola vez)
-- =============================================================================

-- 1. 20260511190000_init_schema.sql
create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

do $$ begin
  create type app_role as enum ('superadmin', 'admin', 'empleado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('unpaid', 'partial', 'paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('cash', 'card', 'transfer', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_source as enum ('internal', 'public');
exception when duplicate_object then null; end $$;

create table if not exists public.businesses (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  phone         text,
  address       text,
  timezone      text not null default 'America/Santo_Domingo',
  currency      text not null default 'USD',
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists businesses_slug_idx on public.businesses(slug);

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

create table if not exists public.services (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses(id) on delete cascade,
  name              text not null,
  description       text,
  duration_minutes  integer not null check (duration_minutes > 0),
  price             numeric(12, 2) not null check (price >= 0),
  local_percentage  numeric(5, 2) not null default 50
                      check (local_percentage between 0 and 100),
  color             text,
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists services_business_idx on public.services(business_id);

create table if not exists public.employee_services (
  employee_id  uuid not null references public.profiles(id) on delete cascade,
  service_id   uuid not null references public.services(id) on delete cascade,
  primary key (employee_id, service_id)
);
create index if not exists employee_services_service_idx on public.employee_services(service_id);

create table if not exists public.clients (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  full_name    text not null,
  phone        text not null,
  email        text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (business_id, phone)
);
create index if not exists clients_business_idx on public.clients(business_id);
create index if not exists clients_phone_idx on public.clients(business_id, phone);

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
  service_notes     text,
  internal_notes    text,
  reminder_sent_at  timestamptz,
  source            appointment_source not null default 'internal',
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (end_time > start_time),
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

-- 2. 20260511190100_rls_policies.sql
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

alter table public.businesses          enable row level security;
alter table public.profiles            enable row level security;
alter table public.employee_schedules  enable row level security;
alter table public.services            enable row level security;
alter table public.employee_services   enable row level security;
alter table public.clients             enable row level security;
alter table public.appointments        enable row level security;
alter table public.transactions        enable row level security;

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

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (public.is_superadmin() or id = auth.uid() or business_id = public.auth_business_id());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (
    public.is_superadmin()
    or (public.auth_role() = 'admin' and business_id = public.auth_business_id() and role <> 'superadmin')
  );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (public.is_superadmin() or id = auth.uid() or (public.auth_role() = 'admin' and business_id = public.auth_business_id()))
  with check (public.is_superadmin() or id = auth.uid() or (public.auth_role() = 'admin' and business_id = public.auth_business_id()));

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete to authenticated
  using (public.is_superadmin() or (public.auth_role() = 'admin' and business_id = public.auth_business_id()));

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

drop policy if exists services_select on public.services;
create policy services_select on public.services
  for select to authenticated
  using (public.is_staff_of(business_id));

drop policy if exists services_write on public.services;
create policy services_write on public.services
  for all to authenticated
  using (public.is_admin_of(business_id))
  with check (public.is_admin_of(business_id));

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

drop policy if exists appointments_select on public.appointments;
create policy appointments_select on public.appointments
  for select to authenticated
  using (public.is_superadmin() or public.is_admin_of(business_id) or (employee_id = auth.uid()));

drop policy if exists appointments_insert on public.appointments;
create policy appointments_insert on public.appointments
  for insert to authenticated
  with check (public.is_staff_of(business_id));

drop policy if exists appointments_update on public.appointments;
create policy appointments_update on public.appointments
  for update to authenticated
  using (public.is_admin_of(business_id) or (employee_id = auth.uid() and public.is_staff_of(business_id)))
  with check (public.is_admin_of(business_id) or (employee_id = auth.uid() and public.is_staff_of(business_id)));

drop policy if exists appointments_delete on public.appointments;
create policy appointments_delete on public.appointments
  for delete to authenticated
  using (public.is_admin_of(business_id));

drop policy if exists transactions_select on public.transactions;
create policy transactions_select on public.transactions
  for select to authenticated
  using (public.is_superadmin() or public.is_admin_of(business_id) or exists (
    select 1 from public.appointments a where a.id = transactions.appointment_id and a.employee_id = auth.uid()
  ));

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
  using (public.is_superadmin());

-- 3. 20260511190200_functions.sql
-- public_business_info moved to section 8 (20260518190000) — skips deleted column primary_color

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
  where b.slug = p_slug and b.active = true and s.active = true
  order by s.name;
$$;

create or replace function public.public_list_employees_for_service(
  p_slug text, p_service_id uuid
)
returns table (id uuid, full_name text, avatar_url text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.full_name, p.avatar_url
  from public.profiles p
  join public.businesses b on b.id = p.business_id
  join public.employee_services es on es.employee_id = p.id
  where b.slug = p_slug and b.active = true and p.active = true
    and p.role = 'empleado' and es.service_id = p_service_id
  order by p.full_name;
$$;

create or replace function public.public_get_available_slots(
  p_slug text, p_employee_id uuid, p_service_id uuid,
  p_date_from date, p_date_to date, p_slot_minutes integer default 15
)
returns table (slot_start timestamptz, slot_end timestamptz)
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
  if p_date_to < p_date_from then raise exception 'p_date_to must be >= p_date_from'; end if;
  if (p_date_to - p_date_from) > v_max_days then raise exception 'Date range too large (max %)', v_max_days; end if;

  select b.id, b.timezone into v_business_id, v_timezone from public.businesses b where b.slug = p_slug and b.active = true;
  if v_business_id is null then return; end if;

  if not exists (select 1 from public.profiles p where p.id = p_employee_id and p.business_id = v_business_id and p.active = true and p.role = 'empleado') then return; end if;

  select s.duration_minutes into v_duration from public.services s
    join public.employee_services es on es.service_id = s.id and es.employee_id = p_employee_id
    where s.id = p_service_id and s.business_id = v_business_id and s.active = true;
  if v_duration is null then return; end if;

  v_step := make_interval(mins => p_slot_minutes);

  return query
  with days as (
    select gs::date as d from generate_series(p_date_from, p_date_to, interval '1 day') gs
  ),
  blocks as (
    select d.d as day,
      (timezone(v_timezone, (d.d::text || ' ' || sched.start_time::text)::timestamp)) as block_start,
      (timezone(v_timezone, (d.d::text || ' ' || sched.end_time::text)::timestamp)) as block_end
    from days d
    join public.employee_schedules sched on sched.employee_id = p_employee_id
    where extract(dow from (d.d at time zone v_timezone))::int = sched.weekday
  ),
  candidate_slots as (
    select gs as slot_start, gs + make_interval(mins => v_duration) as slot_end, b.block_end as block_end
    from blocks b,
    lateral generate_series(b.block_start, b.block_end - make_interval(mins => v_duration), v_step) gs
  )
  select cs.slot_start, cs.slot_end
  from candidate_slots cs
  where cs.slot_end <= cs.block_end and cs.slot_start > v_now
    and not exists (
      select 1 from public.appointments a
      where a.employee_id = p_employee_id and a.status in ('pending', 'confirmed', 'completed')
        and tstzrange(a.start_time, a.end_time, '[)') && tstzrange(cs.slot_start, cs.slot_end, '[)')
    )
  order by cs.slot_start;
end;
$$;

create or replace function public.public_book_appointment(
  p_slug text, p_employee_id uuid, p_service_id uuid, p_start_time timestamptz,
  p_client_name text, p_client_phone text, p_client_email text default null, p_client_notes text default null
)
returns table (appointment_id uuid, start_time timestamptz, end_time timestamptz, status appointment_status)
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_business_id  uuid; v_duration integer; v_end_time timestamptz; v_client_id uuid; v_appt_id uuid;
  v_clean_phone text; v_clean_name text;
begin
  v_clean_phone := nullif(trim(p_client_phone), ''); v_clean_name := nullif(trim(p_client_name), '');
  if v_clean_phone is null or length(v_clean_phone) < 7 then raise exception 'Invalid phone number'; end if;
  if v_clean_name is null then raise exception 'Client name is required'; end if;
  if p_start_time <= now() then raise exception 'Start time must be in the future'; end if;

  select b.id into v_business_id from public.businesses b where b.slug = p_slug and b.active = true;
  if v_business_id is null then raise exception 'Business not found'; end if;

  if not exists (select 1 from public.profiles p where p.id = p_employee_id and p.business_id = v_business_id and p.active = true and p.role = 'empleado') then raise exception 'Employee not available'; end if;

  select s.duration_minutes into v_duration from public.services s
    join public.employee_services es on es.service_id = s.id and es.employee_id = p_employee_id
    where s.id = p_service_id and s.business_id = v_business_id and s.active = true;
  if v_duration is null then raise exception 'Service not available for this employee'; end if;

  v_end_time := p_start_time + make_interval(mins => v_duration);

  if exists (select 1 from public.appointments a where a.employee_id = p_employee_id and a.status in ('pending', 'confirmed', 'completed')
    and tstzrange(a.start_time, a.end_time, '[)') && tstzrange(p_start_time, v_end_time, '[)'))
  then raise exception 'Slot is no longer available'; end if;

  insert into public.clients (business_id, full_name, phone, email)
  values (v_business_id, v_clean_name, v_clean_phone, nullif(trim(p_client_email), ''))
  on conflict (business_id, phone) do update
    set full_name = excluded.full_name, email = coalesce(excluded.email, public.clients.email), updated_at = now()
  returning id into v_client_id;

  insert into public.appointments (business_id, client_id, employee_id, service_id, start_time, end_time, status, payment_status, internal_notes, source)
  values (v_business_id, v_client_id, p_employee_id, p_service_id, p_start_time, v_end_time, 'pending', 'unpaid', nullif(trim(p_client_notes), ''), 'public')
  returning id into v_appt_id;

  return query select v_appt_id, p_start_time, v_end_time, 'pending'::appointment_status;
end;
$$;

grant execute on function public.public_business_info(text) to anon, authenticated;
grant execute on function public.public_list_services(text) to anon, authenticated;
grant execute on function public.public_list_employees_for_service(text, uuid) to anon, authenticated;
grant execute on function public.public_get_available_slots(text, uuid, uuid, date, date, integer) to anon, authenticated;
grant execute on function public.public_book_appointment(text, uuid, uuid, timestamptz, text, text, text, text) to anon, authenticated;

create or replace function public.financial_summary(
  p_business_id uuid, p_period_start date, p_period_end date, p_period text default 'day', p_employee_id uuid default null
)
returns table (bucket date, appointments bigint, total_amount numeric, local_amount numeric, employee_amount numeric)
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare v_trunc text; v_tz text;
begin
  if not public.is_staff_of(p_business_id) then raise exception 'Not authorized'; end if;
  if p_period not in ('day', 'week', 'month') then raise exception 'p_period must be day|week|month'; end if;
  v_trunc := p_period;
  select b.timezone into v_tz from public.businesses b where b.id = p_business_id;
  return query
  select date_trunc(v_trunc, (t.paid_at at time zone coalesce(v_tz, 'UTC')))::date as bucket,
    count(distinct t.appointment_id)::bigint as appointments,
    coalesce(sum(t.total_amount), 0) as total_amount,
    coalesce(sum(t.local_amount), 0) as local_amount,
    coalesce(sum(t.employee_amount), 0) as employee_amount
  from public.transactions t
  join public.appointments a on a.id = t.appointment_id
  where t.business_id = p_business_id
    and t.paid_at >= (p_period_start::timestamp at time zone coalesce(v_tz, 'UTC'))
    and t.paid_at < ((p_period_end + 1)::timestamp at time zone coalesce(v_tz, 'UTC'))
    and (p_employee_id is null or a.employee_id = p_employee_id)
  group by 1 order by 1;
end;
$$;
grant execute on function public.financial_summary(uuid, date, date, text, uuid) to authenticated;

create or replace function public.record_payment(
  p_appointment_id uuid, p_amount numeric, p_method payment_method default 'cash', p_notes text default null
)
returns uuid
language plpgsql
volatile
security invoker
set search_path = public, pg_temp
as $$
declare
  v_appt public.appointments; v_service public.services;
  v_local_pct numeric(5,2); v_employee_pct numeric(5,2);
  v_local_amount numeric(12,2); v_employee_amount numeric(12,2);
  v_tx_id uuid; v_paid_so_far numeric(12,2);
begin
  select * into v_appt from public.appointments where id = p_appointment_id;
  if v_appt.id is null then raise exception 'Appointment not found'; end if;
  if not public.is_admin_of(v_appt.business_id) then raise exception 'Not authorized'; end if;
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  select * into v_service from public.services where id = v_appt.service_id;
  v_local_pct := v_service.local_percentage; v_employee_pct := 100 - v_local_pct;
  v_local_amount := round(p_amount * v_local_pct / 100, 2);
  v_employee_amount := round(p_amount - v_local_amount, 2);
  insert into public.transactions (business_id, appointment_id, total_amount, local_amount, employee_amount, local_percentage, employee_percentage, method, created_by, notes)
  values (v_appt.business_id, p_appointment_id, p_amount, v_local_amount, v_employee_amount, v_local_pct, v_employee_pct, p_method, auth.uid(), p_notes)
  returning id into v_tx_id;
  select coalesce(sum(total_amount), 0) into v_paid_so_far from public.transactions where appointment_id = p_appointment_id;
  update public.appointments set payment_status = case when v_paid_so_far >= v_service.price then 'paid'::payment_status when v_paid_so_far > 0 then 'partial'::payment_status else 'unpaid'::payment_status end
  where id = p_appointment_id;
  return v_tx_id;
end;
$$;
grant execute on function public.record_payment(uuid, numeric, payment_method, text) to authenticated;

-- 4. 20260512143000_extend_operational_schema.sql
do $$ begin
  create type employee_absence_type as enum ('break', 'vacation', 'sick_leave', 'personal', 'blocked');
exception when duplicate_object then null; end $$;

alter table public.clients
  add column if not exists birthday date,
  add column if not exists active boolean not null default true;

alter table public.services
  add column if not exists category text not null default 'otros',
  add column if not exists icon text;

alter table public.profiles
  add column if not exists job_title text,
  add column if not exists pay_type text not null default 'percentage',
  add column if not exists pay_percentage numeric(5,2) not null default 50 check (pay_percentage between 0 and 100),
  add column if not exists base_salary numeric(12,2) not null default 0 check (base_salary >= 0);

create table if not exists public.client_preferred_services (
  client_id uuid not null references public.clients(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (client_id, service_id)
);

create table if not exists public.employee_absences (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  type employee_absence_type not null default 'blocked',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists clients_business_active_idx on public.clients(business_id, active);
create index if not exists services_business_category_active_idx on public.services(business_id, category, active);
create index if not exists client_preferred_services_service_idx on public.client_preferred_services(service_id);
create index if not exists employee_absences_business_idx on public.employee_absences(business_id);
create index if not exists employee_absences_employee_range_idx on public.employee_absences(employee_id, starts_at, ends_at);

drop trigger if exists employee_absences_set_updated_at on public.employee_absences;
create trigger employee_absences_set_updated_at
  before update on public.employee_absences
  for each row execute function public.set_updated_at();

alter table public.client_preferred_services enable row level security;
alter table public.employee_absences enable row level security;

drop policy if exists client_preferred_services_select on public.client_preferred_services;
create policy client_preferred_services_select on public.client_preferred_services
  for select to authenticated
  using (exists (select 1 from public.clients c where c.id = client_preferred_services.client_id and public.is_staff_of(c.business_id)));

drop policy if exists client_preferred_services_write on public.client_preferred_services;
create policy client_preferred_services_write on public.client_preferred_services
  for all to authenticated
  using (exists (select 1 from public.clients c where c.id = client_preferred_services.client_id and public.is_staff_of(c.business_id)))
  with check (exists (select 1 from public.clients c join public.services s on s.id = client_preferred_services.service_id
    where c.id = client_preferred_services.client_id and c.business_id = s.business_id and public.is_staff_of(c.business_id)));

drop policy if exists employee_absences_select on public.employee_absences;
create policy employee_absences_select on public.employee_absences
  for select to authenticated
  using (public.is_admin_of(business_id) or (employee_id = auth.uid() and public.is_staff_of(business_id)));

drop policy if exists employee_absences_insert on public.employee_absences;
create policy employee_absences_insert on public.employee_absences
  for insert to authenticated
  with check (public.is_admin_of(business_id) or (employee_id = auth.uid() and public.is_staff_of(business_id)));

drop policy if exists employee_absences_update on public.employee_absences;
create policy employee_absences_update on public.employee_absences
  for update to authenticated
  using (public.is_admin_of(business_id) or (employee_id = auth.uid() and public.is_staff_of(business_id)))
  with check (public.is_admin_of(business_id) or (employee_id = auth.uid() and public.is_staff_of(business_id)));

drop policy if exists employee_absences_delete on public.employee_absences;
create policy employee_absences_delete on public.employee_absences
  for delete to authenticated
  using (public.is_admin_of(business_id));

create or replace function public.public_get_available_slots(
  p_slug text, p_employee_id uuid, p_service_id uuid,
  p_date_from date, p_date_to date, p_slot_minutes integer default 15
)
returns table (slot_start timestamptz, slot_end timestamptz)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_business_id uuid; v_timezone text; v_duration integer; v_step interval;
  v_now timestamptz := now(); v_max_days integer := 90;
begin
  if p_date_to < p_date_from then raise exception 'p_date_to must be >= p_date_from'; end if;
  if (p_date_to - p_date_from) > v_max_days then raise exception 'Date range too large (max %)', v_max_days; end if;

  select b.id, b.timezone into v_business_id, v_timezone from public.businesses b where b.slug = p_slug and b.active = true;
  if v_business_id is null then return; end if;

  if not exists (select 1 from public.profiles p where p.id = p_employee_id and p.business_id = v_business_id and p.active = true and p.role = 'empleado') then return; end if;

  select s.duration_minutes into v_duration from public.services s
    join public.employee_services es on es.service_id = s.id and es.employee_id = p_employee_id
    where s.id = p_service_id and s.business_id = v_business_id and s.active = true;
  if v_duration is null then return; end if;

  v_step := make_interval(mins => p_slot_minutes);

  return query
  with days as (
    select gs::date as d from generate_series(p_date_from, p_date_to, interval '1 day') gs
  ),
  blocks as (
    select d.d as day,
      (timezone(v_timezone, (d.d::text || ' ' || sched.start_time::text)::timestamp)) as block_start,
      (timezone(v_timezone, (d.d::text || ' ' || sched.end_time::text)::timestamp)) as block_end
    from days d
    join public.employee_schedules sched on sched.employee_id = p_employee_id
    where extract(dow from (d.d at time zone v_timezone))::int = sched.weekday
  ),
  candidate_slots as (
    select gs as slot_start, gs + make_interval(mins => v_duration) as slot_end, b.block_end as block_end
    from blocks b,
    lateral generate_series(b.block_start, b.block_end - make_interval(mins => v_duration), v_step) gs
  )
  select cs.slot_start, cs.slot_end
  from candidate_slots cs
  where cs.slot_end <= cs.block_end and cs.slot_start > v_now
    and not exists (
      select 1 from public.appointments a
      where a.employee_id = p_employee_id and a.status in ('pending', 'confirmed', 'completed')
        and tstzrange(a.start_time, a.end_time, '[)') && tstzrange(cs.slot_start, cs.slot_end, '[)')
    )
    and not exists (
      select 1 from public.employee_absences ea
      where ea.employee_id = p_employee_id and ea.business_id = v_business_id
        and tstzrange(ea.starts_at, ea.ends_at, '[)') && tstzrange(cs.slot_start, cs.slot_end, '[)')
    )
  order by cs.slot_start;
end;
$$;
grant execute on function public.public_get_available_slots(text, uuid, uuid, date, date, integer) to anon, authenticated;

-- 5. 20260516120000_add_expenses.sql
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  category text not null default 'general',
  amount numeric(12,2) not null check (amount >= 0),
  expense_date date not null default current_date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists expenses_business_date_idx on public.expenses(business_id, expense_date desc);
drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at before update on public.expenses for each row execute function public.set_updated_at();
alter table public.expenses enable row level security;

drop policy if exists expenses_select on public.expenses;
create policy expenses_select on public.expenses for select to authenticated using (public.is_staff_of(business_id));
drop policy if exists expenses_insert on public.expenses;
create policy expenses_insert on public.expenses for insert to authenticated with check (public.is_admin_of(business_id));
drop policy if exists expenses_update on public.expenses;
create policy expenses_update on public.expenses for update to authenticated using (public.is_admin_of(business_id)) with check (public.is_admin_of(business_id));
drop policy if exists expenses_delete on public.expenses;
create policy expenses_delete on public.expenses for delete to authenticated using (public.is_admin_of(business_id));

-- 6. 20260518170000_remove_client_active.sql
alter table public.clients drop column if exists active;
drop index if exists clients_business_active_idx;

-- 7. 20260518190000_add_business_config_metadata.sql
alter table public.businesses
  add column if not exists niche_type text not null default 'salon',
  add column if not exists theme_config jsonb not null default '{"primary":"#2F4156","secondary":"#567CB0"}'::jsonb,
  add column if not exists terminology jsonb not null default '{"client":"Cliente","employee":"Empleado","service":"Servicio","appointment":"Cita","staff":"Personal","pet":"Mascota","owner":"Dueño","breed":"Raza","weight":"Peso","vaccines":"Vacunas"}'::jsonb;
alter table public.clients add column if not exists metadata jsonb not null default '{}'::jsonb;
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'businesses' and column_name = 'primary_color') then
    update public.businesses set theme_config = jsonb_set(theme_config, '{primary}', to_jsonb(primary_color), true) where primary_color is not null;
    alter table public.businesses drop column primary_color;
  end if;
end;
$$;
drop function if exists public.public_business_info(text);

create or replace function public.public_business_info(p_slug text)
returns table (id uuid, name text, timezone text, currency text, niche_type text, theme_config jsonb, terminology jsonb, phone text, address text)
language sql stable security definer set search_path = public, pg_temp
as $$
  select b.id, b.name, b.timezone, b.currency, b.niche_type, b.theme_config, b.terminology, b.phone, b.address
  from public.businesses b where b.slug = p_slug and b.active = true;
$$;
grant execute on function public.public_business_info(text) to anon, authenticated;

-- 8. 20260519120000_add_inventory_and_service_variants.sql
do $$ begin
  create type inventory_movement_type as enum ('purchase', 'sale', 'adjustment', 'transfer_in', 'transfer_out', 'return', 'consumption');
exception when duplicate_object then null; end $$;

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  parent_id uuid references public.service_categories(id) on delete set null,
  name text not null, description text, active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (business_id, name)
);
create index if not exists service_categories_business_idx on public.service_categories(business_id);
create index if not exists service_categories_parent_idx on public.service_categories(parent_id);

alter table public.services add column if not exists service_category_id uuid references public.service_categories(id) on delete set null;
create index if not exists services_service_category_idx on public.services(service_category_id);

create table if not exists public.service_variants (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  name text not null, description text, duration_minutes integer, price numeric(12,2),
  active boolean not null default true, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (service_id, name)
);
create index if not exists service_variants_service_idx on public.service_variants(service_id);
create index if not exists service_variants_business_idx on public.service_variants(business_id);

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  parent_id uuid references public.product_categories(id) on delete set null,
  name text not null, description text, active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (business_id, name)
);
create index if not exists product_categories_business_idx on public.product_categories(business_id);
create index if not exists product_categories_parent_idx on public.product_categories(parent_id);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id uuid references public.product_categories(id) on delete set null,
  name text not null, description text, sku text, barcode text,
  unit text not null default 'unit',
  unit_cost numeric(12,4) not null default 0 check (unit_cost >= 0),
  unit_price numeric(12,4) not null default 0 check (unit_price >= 0),
  reorder_point numeric(12,4) not null default 0 check (reorder_point >= 0),
  active boolean not null default true, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (business_id, name), unique (business_id, sku)
);
create index if not exists products_business_idx on public.products(business_id);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_active_idx on public.products(business_id, active);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null, sku text,
  unit_cost numeric(12,4) not null default 0 check (unit_cost >= 0),
  unit_price numeric(12,4) not null default 0 check (unit_price >= 0),
  metadata jsonb not null default '{}'::jsonb, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (product_id, name)
);
create index if not exists product_variants_product_idx on public.product_variants(product_id);

create table if not exists public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null, is_default boolean not null default false, active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (business_id, name)
);
create index if not exists inventory_locations_business_idx on public.inventory_locations(business_id);

create table if not exists public.inventory_stock (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  location_id uuid not null references public.inventory_locations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  quantity numeric(12,4) not null default 0, reserved_qty numeric(12,4) not null default 0,
  updated_at timestamptz not null default now(),
  check (quantity >= 0), check (reserved_qty >= 0)
);
create unique index if not exists inventory_stock_unique_idx on public.inventory_stock(location_id, product_id, variant_id);
create index if not exists inventory_stock_business_idx on public.inventory_stock(business_id);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  location_id uuid not null references public.inventory_locations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  movement_type inventory_movement_type not null,
  quantity numeric(12,4) not null, unit_cost numeric(12,4) not null default 0,
  reference_type text, reference_id uuid, notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (quantity <> 0)
);
create index if not exists inventory_movements_business_idx on public.inventory_movements(business_id, created_at desc);
create index if not exists inventory_movements_product_idx on public.inventory_movements(product_id);

-- Updated_at triggers
drop trigger if exists service_categories_set_updated_at on public.service_categories;
create trigger service_categories_set_updated_at before update on public.service_categories for each row execute function public.set_updated_at();
drop trigger if exists service_variants_set_updated_at on public.service_variants;
create trigger service_variants_set_updated_at before update on public.service_variants for each row execute function public.set_updated_at();
drop trigger if exists product_categories_set_updated_at on public.product_categories;
create trigger product_categories_set_updated_at before update on public.product_categories for each row execute function public.set_updated_at();
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
drop trigger if exists product_variants_set_updated_at on public.product_variants;
create trigger product_variants_set_updated_at before update on public.product_variants for each row execute function public.set_updated_at();
drop trigger if exists inventory_locations_set_updated_at on public.inventory_locations;
create trigger inventory_locations_set_updated_at before update on public.inventory_locations for each row execute function public.set_updated_at();
drop trigger if exists inventory_stock_set_updated_at on public.inventory_stock;
create trigger inventory_stock_set_updated_at before update on public.inventory_stock for each row execute function public.set_updated_at();

alter table public.service_categories enable row level security;
alter table public.service_variants enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory_locations enable row level security;
alter table public.inventory_stock enable row level security;
alter table public.inventory_movements enable row level security;

-- RLS policies for inventory
drop policy if exists service_categories_select on public.service_categories;
create policy service_categories_select on public.service_categories for select to authenticated using (public.is_staff_of(business_id));
drop policy if exists service_categories_write on public.service_categories;
create policy service_categories_write on public.service_categories for all to authenticated using (public.is_admin_of(business_id)) with check (public.is_admin_of(business_id));
drop policy if exists service_variants_select on public.service_variants;
create policy service_variants_select on public.service_variants for select to authenticated using (public.is_staff_of(business_id));
drop policy if exists service_variants_write on public.service_variants;
create policy service_variants_write on public.service_variants for all to authenticated using (public.is_admin_of(business_id)) with check (public.is_admin_of(business_id));
drop policy if exists product_categories_select on public.product_categories;
create policy product_categories_select on public.product_categories for select to authenticated using (public.is_staff_of(business_id));
drop policy if exists product_categories_write on public.product_categories;
create policy product_categories_write on public.product_categories for all to authenticated using (public.is_admin_of(business_id)) with check (public.is_admin_of(business_id));
drop policy if exists products_select on public.products;
create policy products_select on public.products for select to authenticated using (public.is_staff_of(business_id));
drop policy if exists products_write on public.products;
create policy products_write on public.products for all to authenticated using (public.is_admin_of(business_id)) with check (public.is_admin_of(business_id));
drop policy if exists product_variants_select on public.product_variants;
create policy product_variants_select on public.product_variants for select to authenticated using (exists (select 1 from public.products p where p.id = product_variants.product_id and public.is_staff_of(p.business_id)));
drop policy if exists product_variants_write on public.product_variants;
create policy product_variants_write on public.product_variants for all to authenticated using (exists (select 1 from public.products p where p.id = product_variants.product_id and public.is_admin_of(p.business_id))) with check (exists (select 1 from public.products p where p.id = product_variants.product_id and public.is_admin_of(p.business_id)));
drop policy if exists inventory_locations_select on public.inventory_locations;
create policy inventory_locations_select on public.inventory_locations for select to authenticated using (public.is_staff_of(business_id));
drop policy if exists inventory_locations_write on public.inventory_locations;
create policy inventory_locations_write on public.inventory_locations for all to authenticated using (public.is_admin_of(business_id)) with check (public.is_admin_of(business_id));
drop policy if exists inventory_stock_select on public.inventory_stock;
create policy inventory_stock_select on public.inventory_stock for select to authenticated using (public.is_staff_of(business_id));
drop policy if exists inventory_stock_write on public.inventory_stock;
create policy inventory_stock_write on public.inventory_stock for all to authenticated using (public.is_admin_of(business_id)) with check (public.is_admin_of(business_id));
drop policy if exists inventory_movements_select on public.inventory_movements;
create policy inventory_movements_select on public.inventory_movements for select to authenticated using (public.is_staff_of(business_id));
drop policy if exists inventory_movements_write on public.inventory_movements;
create policy inventory_movements_write on public.inventory_movements for all to authenticated using (public.is_admin_of(business_id)) with check (public.is_admin_of(business_id));

-- 9. 20260521120000_record_sale.sql
create or replace function public.record_sale(
  p_appointment_id uuid, p_amount numeric, p_method payment_method default 'cash',
  p_products jsonb default '[]'::jsonb, p_notes text default null
)
returns uuid
language plpgsql volatile security invoker set search_path = public, pg_temp
as $$
declare v_tx_id uuid; v_product jsonb; v_stock numeric(12,4); v_default_loc uuid;
begin
  select public.record_payment(p_appointment_id, p_amount, p_method, p_notes) into v_tx_id;
  if jsonb_array_length(p_products) > 0 then
    select id into v_default_loc from public.inventory_locations
    where business_id = (select business_id from public.appointments where id = p_appointment_id) and is_default = true limit 1;
    for v_product in select * from jsonb_array_elements(p_products) loop
      select quantity into v_stock from public.inventory_stock
      where product_id = (v_product->>'product_id')::uuid
        and variant_id is not distinct from (v_product->>'variant_id')::uuid
        and location_id = coalesce((v_product->>'location_id')::uuid, v_default_loc);
      if v_stock is null or v_stock < (v_product->>'quantity')::numeric then
        raise exception 'Stock insuficiente para el producto %', (v_product->>'product_id')::uuid;
      end if;
      update public.inventory_stock set quantity = quantity - (v_product->>'quantity')::numeric, updated_at = now()
      where product_id = (v_product->>'product_id')::uuid
        and variant_id is not distinct from (v_product->>'variant_id')::uuid
        and location_id = coalesce((v_product->>'location_id')::uuid, v_default_loc);
      insert into public.inventory_movements (business_id, location_id, product_id, variant_id, movement_type, quantity, unit_cost, reference_type, reference_id, notes, created_by)
      values ((select business_id from public.appointments where id = p_appointment_id),
        coalesce((v_product->>'location_id')::uuid, v_default_loc),
        (v_product->>'product_id')::uuid, (v_product->>'variant_id')::uuid,
        'sale', -(v_product->>'quantity')::numeric, coalesce((v_product->>'unit_cost')::numeric, 0),
        'appointment', p_appointment_id, 'Venta punto de venta', auth.uid());
    end loop;
  end if;
  return v_tx_id;
end;
$$;
grant execute on function public.record_sale(uuid, numeric, payment_method, jsonb, text) to authenticated;

-- 10. 20260521150000_fix_currency_to_usd.sql
update public.businesses set currency = 'USD' where currency != 'USD';

-- 11. 20260521160000_add_multicurrency_support.sql
alter table public.businesses add column if not exists ves_exchange_rate numeric(12,4) not null default 36.5000;
alter type public.payment_method add value if not exists 'zelle';
alter type public.payment_method add value if not exists 'pago_movil';
alter type public.payment_method add value if not exists 'mixed';
alter table public.transactions
  add column if not exists exchange_rate_used numeric(12,4) not null default 1.0000,
  add column if not exists payments_breakdown jsonb not null default '[]'::jsonb;

-- 12. 20260521200000_update_functions_multicurrency.sql
-- (record_payment redefined below at 12c with latest version)

-- 12a. 20260619000000_add_assistant_employee.sql
alter table public.appointments
  add column if not exists assistant_employee_id uuid references public.profiles(id),
  add column if not exists assistant_percentage numeric(5, 2);

alter table public.transactions
  add column if not exists assistant_amount numeric(12, 2) not null default 0,
  add column if not exists assistant_percentage numeric(5, 2) not null default 0;

-- 12b. 20260624150000_add_employee_percentage_override.sql
alter table public.appointments
  add column if not exists employee_percentage_override numeric(5, 2);

-- 12c. Latest record_payment (from 20260624150000 with assistant + override)
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
  if v_appt.id is null then
    raise exception 'Appointment not found';
  end if;

  if not public.is_admin_of(v_appt.business_id) then
    raise exception 'Not authorized';
  end if;

  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

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
grant execute on function public.record_payment(uuid, numeric, payment_method, text, numeric, jsonb) to authenticated;

-- 13. 20260526100000_add_job_titles_to_business.sql
alter table public.businesses add column if not exists job_titles jsonb not null default '[]'::jsonb;

-- 14. 20260526200000_add_service_categories_to_business.sql
alter table public.businesses add column if not exists service_categories jsonb not null default '[]'::jsonb;

create or replace function public.record_sale(
  p_appointment_id uuid, p_amount numeric, p_method payment_method default 'cash',
  p_products jsonb default '[]'::jsonb, p_notes text default null,
  p_exchange_rate numeric default null, p_payments_breakdown jsonb default '[]'::jsonb
)
returns uuid
language plpgsql volatile security invoker set search_path = public, pg_temp
as $$
declare v_tx_id uuid; v_product jsonb; v_stock numeric(12,4); v_default_loc uuid;
begin
  select public.record_payment(p_appointment_id, p_amount, p_method, p_notes, p_exchange_rate, p_payments_breakdown) into v_tx_id;
  if jsonb_array_length(p_products) > 0 then
    select id into v_default_loc from public.inventory_locations
    where business_id = (select business_id from public.appointments where id = p_appointment_id) and is_default = true limit 1;
    for v_product in select * from jsonb_array_elements(p_products) loop
      select quantity into v_stock from public.inventory_stock
      where product_id = (v_product->>'product_id')::uuid
        and variant_id is not distinct from (v_product->>'variant_id')::uuid
        and location_id = coalesce((v_product->>'location_id')::uuid, v_default_loc);
      if v_stock is null or v_stock < (v_product->>'quantity')::numeric then
        raise exception 'Stock insuficiente para el producto %', (v_product->>'product_id')::uuid;
      end if;
      update public.inventory_stock set quantity = quantity - (v_product->>'quantity')::numeric, updated_at = now()
      where product_id = (v_product->>'product_id')::uuid
        and variant_id is not distinct from (v_product->>'variant_id')::uuid
        and location_id = coalesce((v_product->>'location_id')::uuid, v_default_loc);
      insert into public.inventory_movements (business_id, location_id, product_id, variant_id, movement_type, quantity, unit_cost, reference_type, reference_id, notes, created_by)
      values ((select business_id from public.appointments where id = p_appointment_id),
        coalesce((v_product->>'location_id')::uuid, v_default_loc),
        (v_product->>'product_id')::uuid, (v_product->>'variant_id')::uuid,
        'sale', -(v_product->>'quantity')::numeric, coalesce((v_product->>'unit_cost')::numeric, 0),
        'appointment', p_appointment_id, 'Venta punto de venta', auth.uid());
    end loop;
  end if;
  return v_tx_id;
end;
$$;
grant execute on function public.record_sale(uuid, numeric, payment_method, jsonb, text, numeric, jsonb) to authenticated;
