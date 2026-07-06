-- =============================================================================
-- Sistema de Salones — Extensiones operativas para integración frontend
-- =============================================================================
-- Alinea el modelo persistente con las pantallas actuales:
-- clientes con cumpleaños/estado, servicios categorizados, e indisponibilidades
-- de empleados para vacaciones, descansos o bloqueos manuales.
-- =============================================================================

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
  add column if not exists pay_percentage numeric(5, 2) not null default 50 check (pay_percentage between 0 and 100),
  add column if not exists base_salary numeric(12, 2) not null default 0 check (base_salary >= 0);

create table if not exists public.client_preferred_services (
  client_id   uuid not null references public.clients(id) on delete cascade,
  service_id  uuid not null references public.services(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (client_id, service_id)
);

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

create index if not exists clients_business_active_idx
  on public.clients(business_id, active);

create index if not exists services_business_category_active_idx
  on public.services(business_id, category, active);

create index if not exists client_preferred_services_service_idx
  on public.client_preferred_services(service_id);

create index if not exists employee_absences_business_idx
  on public.employee_absences(business_id);

create index if not exists employee_absences_employee_range_idx
  on public.employee_absences(employee_id, starts_at, ends_at);

drop trigger if exists employee_absences_set_updated_at on public.employee_absences;
create trigger employee_absences_set_updated_at
  before update on public.employee_absences
  for each row execute function public.set_updated_at();

alter table public.client_preferred_services enable row level security;
alter table public.employee_absences enable row level security;

drop policy if exists client_preferred_services_select on public.client_preferred_services;
create policy client_preferred_services_select on public.client_preferred_services
  for select to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_preferred_services.client_id
        and public.is_staff_of(c.business_id)
    )
  );

drop policy if exists client_preferred_services_write on public.client_preferred_services;
create policy client_preferred_services_write on public.client_preferred_services
  for all to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_preferred_services.client_id
        and public.is_staff_of(c.business_id)
    )
  )
  with check (
    exists (
      select 1
      from public.clients c
      join public.services s on s.id = client_preferred_services.service_id
      where c.id = client_preferred_services.client_id
        and c.business_id = s.business_id
        and public.is_staff_of(c.business_id)
    )
  );

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

-- Reemplaza la función de disponibilidad para excluir bloqueos/ausencias.
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
    raise exception 'Date range too large (max % days)', v_max_days;
  end if;

  select b.id, b.timezone
  into v_business_id, v_timezone
  from public.businesses b
  where b.slug = p_slug and b.active = true;

  if v_business_id is null then
    return;
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_employee_id
      and p.business_id = v_business_id
      and p.active = true
      and p.role = 'empleado'
  ) then
    return;
  end if;

  select s.duration_minutes
  into v_duration
  from public.services s
  join public.employee_services es
    on es.service_id = s.id and es.employee_id = p_employee_id
  where s.id = p_service_id
    and s.business_id = v_business_id
    and s.active = true;

  if v_duration is null then
    return;
  end if;

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
      select 1
      from public.appointments a
      where a.employee_id = p_employee_id
        and a.status in ('pending', 'confirmed', 'completed')
        and tstzrange(a.start_time, a.end_time, '[)')
            && tstzrange(cs.slot_start, cs.slot_end, '[)')
    )
    and not exists (
      select 1
      from public.employee_absences ea
      where ea.employee_id = p_employee_id
        and ea.business_id = v_business_id
        and tstzrange(ea.starts_at, ea.ends_at, '[)')
            && tstzrange(cs.slot_start, cs.slot_end, '[)')
    )
  order by cs.slot_start;
end;
$$;

grant execute on function public.public_get_available_slots(text, uuid, uuid, date, date, integer) to anon, authenticated;
