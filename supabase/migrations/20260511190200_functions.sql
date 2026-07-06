-- =============================================================================
-- Sistema de Salones — Funciones de negocio
-- =============================================================================
-- Funciones públicas (anon)  → para auto-agendamiento por link sin login.
-- Funciones internas (auth)  → resumen financiero, helpers para la agenda.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PUBLIC: info básica del salón por slug
-- -----------------------------------------------------------------------------
create or replace function public.public_business_info(p_slug text)
returns table (
  id            uuid,
  name          text,
  timezone      text,
  currency      text,
  primary_color text,
  phone         text,
  address       text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select b.id, b.name, b.timezone, b.currency, b.primary_color, b.phone, b.address
  from public.businesses b
  where b.slug = p_slug and b.active = true;
$$;

-- -----------------------------------------------------------------------------
-- PUBLIC: servicios activos del salón
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- PUBLIC: empleadas activas que ofrecen un servicio
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- PUBLIC: slots disponibles para una empleada/servicio en un rango de fechas
-- -----------------------------------------------------------------------------
-- Genera slots cada `p_slot_minutes` (default 15) dentro del horario laboral
-- de la empleada, descartando los que se solaparían con citas existentes.
-- Devuelve timestamps en UTC; el cliente los formatea a la TZ del negocio.
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

  -- La empleada debe existir, estar activa y pertenecer al negocio.
  if not exists (
    select 1 from public.profiles p
    where p.id = p_employee_id
      and p.business_id = v_business_id
      and p.active = true
      and p.role = 'empleado'
  ) then
    return;
  end if;

  -- El servicio debe pertenecer al negocio, estar activo y ser ofrecido por la empleada.
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
    -- Bloques de horario laboral por día, en la TZ del negocio,
    -- convertidos a timestamptz.
    select
      d.d                                                        as day,
      (timezone(v_timezone, (d.d::text || ' ' || sched.start_time::text)::timestamp))  as block_start,
      (timezone(v_timezone, (d.d::text || ' ' || sched.end_time::text)::timestamp))    as block_end
    from days d
    join public.employee_schedules sched on sched.employee_id = p_employee_id
    where extract(dow from (d.d at time zone v_timezone))::int = sched.weekday
  ),
  candidate_slots as (
    select
      gs                                       as slot_start,
      gs + make_interval(mins => v_duration)   as slot_end,
      b.block_end                              as block_end
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
  order by cs.slot_start;
end;
$$;

-- -----------------------------------------------------------------------------
-- PUBLIC: crear cita desde el link público
-- -----------------------------------------------------------------------------
-- Hace upsert del cliente por (business_id, phone). Crea la cita con
-- status='pending' y source='public'. El salón luego la confirma.
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

  if v_business_id is null then
    raise exception 'Business not found';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_employee_id
      and p.business_id = v_business_id
      and p.active = true
      and p.role = 'empleado'
  ) then
    raise exception 'Employee not available';
  end if;

  select s.duration_minutes into v_duration
  from public.services s
  join public.employee_services es
    on es.service_id = s.id and es.employee_id = p_employee_id
  where s.id = p_service_id
    and s.business_id = v_business_id
    and s.active = true;

  if v_duration is null then
    raise exception 'Service not available for this employee';
  end if;

  v_end_time := p_start_time + make_interval(mins => v_duration);

  -- Verificación final: que el slot siga libre (anti race-condition).
  if exists (
    select 1 from public.appointments a
    where a.employee_id = p_employee_id
      and a.status in ('pending', 'confirmed', 'completed')
      and tstzrange(a.start_time, a.end_time, '[)')
          && tstzrange(p_start_time, v_end_time, '[)')
  ) then
    raise exception 'Slot is no longer available';
  end if;

  -- Upsert del cliente por (business_id, phone).
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

-- Otorgar acceso público (anon + authenticated) a las funciones de booking.
grant execute on function public.public_business_info(text)                       to anon, authenticated;
grant execute on function public.public_list_services(text)                       to anon, authenticated;
grant execute on function public.public_list_employees_for_service(text, uuid)    to anon, authenticated;
grant execute on function public.public_get_available_slots(text, uuid, uuid, date, date, integer) to anon, authenticated;
grant execute on function public.public_book_appointment(text, uuid, uuid, timestamptz, text, text, text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- INTERNAL: resumen financiero por período
-- -----------------------------------------------------------------------------
-- p_period: 'day' | 'week' | 'month' — agrupa transacciones por bucket.
-- Si p_employee_id es null, agrega de todas las empleadas del negocio.
create or replace function public.financial_summary(
  p_business_id  uuid,
  p_period_start date,
  p_period_end   date,
  p_period       text default 'day',
  p_employee_id  uuid default null
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
  group by 1
  order by 1;
end;
$$;

grant execute on function public.financial_summary(uuid, date, date, text, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- INTERNAL: crear pago a partir de una cita (calcula split automáticamente)
-- -----------------------------------------------------------------------------
-- Snapshot del porcentaje del servicio al momento del pago.
create or replace function public.record_payment(
  p_appointment_id uuid,
  p_amount         numeric,
  p_method         payment_method default 'cash',
  p_notes          text default null
)
returns uuid
language plpgsql
volatile
security invoker
set search_path = public, pg_temp
as $$
declare
  v_appt           public.appointments;
  v_service        public.services;
  v_local_pct      numeric(5, 2);
  v_employee_pct   numeric(5, 2);
  v_local_amount   numeric(12, 2);
  v_employee_amount numeric(12, 2);
  v_tx_id          uuid;
  v_paid_so_far    numeric(12, 2);
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

  v_local_pct      := v_service.local_percentage;
  v_employee_pct   := 100 - v_local_pct;
  v_local_amount   := round(p_amount * v_local_pct / 100, 2);
  v_employee_amount := round(p_amount - v_local_amount, 2);

  insert into public.transactions (
    business_id, appointment_id,
    total_amount, local_amount, employee_amount,
    local_percentage, employee_percentage,
    method, created_by, notes
  )
  values (
    v_appt.business_id, p_appointment_id,
    p_amount, v_local_amount, v_employee_amount,
    v_local_pct, v_employee_pct,
    p_method, auth.uid(), p_notes
  )
  returning id into v_tx_id;

  -- Actualiza payment_status según total pagado vs precio del servicio.
  select coalesce(sum(total_amount), 0) into v_paid_so_far
  from public.transactions
  where appointment_id = p_appointment_id;

  update public.appointments
  set payment_status = case
        when v_paid_so_far >= v_service.price then 'paid'::payment_status
        when v_paid_so_far > 0                then 'partial'::payment_status
        else 'unpaid'::payment_status
      end
  where id = p_appointment_id;

  return v_tx_id;
end;
$$;

grant execute on function public.record_payment(uuid, numeric, payment_method, text) to authenticated;
