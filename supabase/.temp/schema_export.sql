--
-- PostgreSQL database dump
--

\restrict lJcIJKifPLb4xCNtsJvIdNIVenFANc1yIDnn32azEGdOqcAmUG7dQDH7fpdvdee

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- Name: EXTENSION btree_gist; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION btree_gist IS 'support for indexing common datatypes in GiST';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'superadmin',
    'admin',
    'empleado'
);


--
-- Name: appointment_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.appointment_source AS ENUM (
    'internal',
    'public'
);


--
-- Name: appointment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.appointment_status AS ENUM (
    'pending',
    'confirmed',
    'completed',
    'cancelled',
    'no_show'
);


--
-- Name: employee_absence_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.employee_absence_type AS ENUM (
    'break',
    'vacation',
    'sick_leave',
    'personal',
    'blocked'
);


--
-- Name: inventory_movement_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.inventory_movement_type AS ENUM (
    'purchase',
    'sale',
    'adjustment',
    'transfer_in',
    'transfer_out',
    'return',
    'consumption'
);


--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_method AS ENUM (
    'cash',
    'card',
    'transfer',
    'other',
    'zelle',
    'pago_movil',
    'mixed',
    'cash_ves',
    'punto_venta'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'unpaid',
    'partial',
    'paid'
);


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
    select current_setting('request.jwt.claim.email', true);
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
    select current_setting('request.jwt.claim.role', true);
$$;


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
    select coalesce(current_setting('request.jwt.claim.sub', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid);
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: businesses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.businesses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    phone text,
    address text,
    timezone text DEFAULT 'America/Santo_Domingo'::text NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    niche_type text DEFAULT 'salon'::text NOT NULL,
    theme_config jsonb DEFAULT '{"primary": "#2F4156", "secondary": "#567CB0"}'::jsonb NOT NULL,
    terminology jsonb DEFAULT '{"pet": "Mascota", "breed": "Raza", "owner": "Dueño", "staff": "Personal", "client": "Cliente", "weight": "Peso", "service": "Servicio", "employee": "Empleado", "vaccines": "Vacunas", "appointment": "Cita"}'::jsonb NOT NULL,
    ves_exchange_rate numeric(12,4) DEFAULT 36.5000 NOT NULL,
    job_titles jsonb DEFAULT '[]'::jsonb NOT NULL,
    service_categories jsonb DEFAULT '[]'::jsonb NOT NULL,
    multi_branch_enabled boolean DEFAULT false NOT NULL,
    features jsonb DEFAULT '{"pos": true, "productos": true, "inventario": true, "proveedores": true, "multi_branch": false, "employees_create_clients": true}'::jsonb NOT NULL,
    employee_ves_rate numeric(12,4)
);


--
-- Name: active_businesses(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.active_businesses() RETURNS SETOF public.businesses
    LANGUAGE sql STABLE
    AS $$
  select * from public.businesses where deleted_at is null;
$$;


--
-- Name: auth_business_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auth_business_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select business_id from public.profiles where id = auth.uid();
$$;


--
-- Name: auth_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auth_role() RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select role from public.profiles where id = auth.uid();
$$;


--
-- Name: check_employee_overlap(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_employee_overlap() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
  if new.status not in ('pending', 'confirmed', 'completed') then
    return new;
  end if;

  -- Skip overlap validation when only payment_status or other non-temporal
  -- columns are being updated (e.g., when record_payment marks an appointment as paid).
  if old.start_time is not distinct from new.start_time
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

  -- Check assistant employee (if assigned)
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


--
-- Name: create_default_branch(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_default_branch() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
  insert into public.branches (business_id, name, is_default)
  values (new.id, new.name || ' — Principal', true)
  on conflict (business_id, name) do nothing;
  return new;
end;
$$;


--
-- Name: delete_product_sale(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_product_sale(p_movement_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_movement public.inventory_movements;
  v_business_id uuid;
begin
  select * into v_movement from public.inventory_movements where id = p_movement_id;
  if v_movement.id is null then
    raise exception 'Movimiento de inventario no encontrado';
  end if;

  if v_movement.movement_type <> 'sale' then
    raise exception 'Solo se pueden eliminar ventas de productos';
  end if;

  select business_id into v_business_id
  from public.inventory_locations
  where id = v_movement.location_id;

  if not public.is_admin_of(v_business_id) then
    raise exception 'No autorizado';
  end if;

  -- Revert stock: add back the absolute quantity sold
  update public.inventory_stock
  set quantity = quantity + abs(v_movement.quantity),
      updated_at = now()
  where product_id = v_movement.product_id
    and variant_id is not distinct from v_movement.variant_id
    and location_id = v_movement.location_id;

  -- Delete the movement
  delete from public.inventory_movements where id = p_movement_id;
end;
$$;


--
-- Name: delete_transaction(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_transaction(p_transaction_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_tx               public.transactions;
  v_paid_so_far      numeric(12, 2);
  v_service          public.services;
  v_appt             public.appointments;
  v_inventory_count  integer;
  v_effective_price  numeric(12, 2);
begin
  select * into v_tx from public.transactions where id = p_transaction_id;
  if v_tx.id is null then
    raise exception 'Transaction not found';
  end if;

  if not public.is_admin_of(v_tx.business_id) then
    raise exception 'Not authorized';
  end if;

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


--
-- Name: financial_summary(uuid, date, date, text, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.financial_summary(p_business_id uuid, p_period_start date, p_period_end date, p_period text DEFAULT 'day'::text, p_employee_id uuid DEFAULT NULL::uuid, p_branch_id uuid DEFAULT NULL::uuid) RETURNS TABLE(bucket date, appointments bigint, total_amount numeric, local_amount numeric, employee_amount numeric)
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: fn_notify_new_appointment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_notify_new_appointment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: fn_notify_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_notify_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: get_low_stock_products(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_low_stock_products() RETURNS TABLE(business_id uuid, id uuid, name text, reorder_point numeric, total_stock numeric)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
  insert into public.profiles (
    id, business_id, full_name, role, phone, avatar_url,
    job_title, pay_type, pay_percentage, base_salary, salary_frequency,
    active, email
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
    coalesce(nullif(new.raw_user_meta_data->>'salary_frequency', ''), 'monthly'),
    true,
    new.email
  );
  return new;
end;
$$;


--
-- Name: is_admin_of(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin_of(target_business uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: is_staff_of(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_staff_of(target_business uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: is_superadmin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_superadmin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select coalesce(
    (select role = 'superadmin' from public.profiles where id = auth.uid()),
    false
  );
$$;


--
-- Name: public_book_appointment(text, uuid, uuid, timestamp with time zone, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.public_book_appointment(p_slug text, p_employee_id uuid, p_service_id uuid, p_start_time timestamp with time zone, p_client_name text, p_client_phone text, p_client_email text DEFAULT NULL::text, p_client_notes text DEFAULT NULL::text) RETURNS TABLE(appointment_id uuid, start_time timestamp with time zone, end_time timestamp with time zone, status public.appointment_status)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: public_business_info(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.public_business_info(p_slug text) RETURNS TABLE(id uuid, name text, timezone text, currency text, niche_type text, theme_config jsonb, terminology jsonb, phone text, address text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select b.id, b.name, b.timezone, b.currency, b.niche_type, b.theme_config, b.terminology, b.phone, b.address
  from public.businesses b
  where b.slug = p_slug and b.active = true and b.deleted_at is null;
$$;


--
-- Name: public_get_available_slots(text, uuid, uuid, date, date, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.public_get_available_slots(p_slug text, p_employee_id uuid, p_service_id uuid, p_date_from date, p_date_to date, p_slot_minutes integer DEFAULT 15) RETURNS TABLE(slot_start timestamp with time zone, slot_end timestamp with time zone)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: public_list_employees_for_service(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.public_list_employees_for_service(p_slug text, p_service_id uuid) RETURNS TABLE(id uuid, full_name text, avatar_url text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: public_list_services(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.public_list_services(p_slug text) RETURNS TABLE(id uuid, name text, description text, duration_minutes integer, price numeric, color text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select s.id, s.name, s.description, s.duration_minutes, s.price, s.color
  from public.services s
  join public.businesses b on b.id = s.business_id
  where b.slug = p_slug
    and b.active = true
    and s.active = true
  order by s.name;
$$;


--
-- Name: record_payment(uuid, numeric, public.payment_method, text, numeric, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_payment(p_appointment_id uuid, p_amount numeric, p_method public.payment_method DEFAULT 'cash'::public.payment_method, p_notes text DEFAULT NULL::text, p_exchange_rate numeric DEFAULT NULL::numeric, p_payments_breakdown jsonb DEFAULT '[]'::jsonb) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_appt               public.appointments;
  v_service            public.services;
  v_employee_profile   public.profiles;
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

  select * into v_employee_profile from public.profiles where id = v_appt.employee_id;

  v_effective_price := coalesce(v_appt.price_override, v_service.price);

  v_assistant_pct   := coalesce(v_appt.assistant_percentage, 0);
  v_employee_pct    := coalesce(
    v_appt.employee_percentage_override,
    v_employee_profile.pay_percentage,
    100 - v_service.local_percentage
  );
  v_local_pct       := 100 - v_employee_pct - v_assistant_pct;

  v_assistant_amount := round(p_amount * v_assistant_pct / 100, 2);
  v_employee_amount  := round(p_amount * v_employee_pct / 100, 2);
  v_local_amount     := round(p_amount - v_employee_amount - v_assistant_amount, 2);

  -- Cascade: explicit override → branch rate → business rate → 1
  v_exchange_rate := coalesce(
    p_exchange_rate,
    (select b.ves_exchange_rate from public.branches b where b.id = v_appt.branch_id),
    (select bz.ves_exchange_rate from public.businesses bz where bz.id = v_appt.business_id),
    1
  );

  insert into public.transactions (
    business_id, branch_id, appointment_id,
    total_amount, local_amount, employee_amount, assistant_amount,
    local_percentage, employee_percentage, assistant_percentage,
    method, exchange_rate_used, payments_breakdown,
    created_by, notes
  )
  values (
    v_appt.business_id, v_appt.branch_id, p_appointment_id,
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


--
-- Name: record_payment(uuid, numeric, public.payment_method, text, numeric, jsonb, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_payment(p_appointment_id uuid, p_amount numeric, p_method public.payment_method DEFAULT 'cash'::public.payment_method, p_notes text DEFAULT NULL::text, p_exchange_rate numeric DEFAULT NULL::numeric, p_payments_breakdown jsonb DEFAULT '[]'::jsonb, p_tip_amount numeric DEFAULT 0) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_appt               public.appointments;
  v_service            public.services;
  v_employee_profile   public.profiles;
  v_effective_price    numeric(12, 2);
  v_local_pct          numeric(5, 2);
  v_employee_pct       numeric(5, 2);
  v_assistant_pct      numeric(5, 2);
  v_local_amount       numeric(12, 2);
  v_employee_amount    numeric(12, 2);
  v_assistant_amount   numeric(12, 2);
  v_tip_amount         numeric(12, 2);
  v_tx_id              uuid;
  v_paid_so_far        numeric(12, 2);
  v_group_paid         numeric(12, 2);
  v_group_target       numeric(12, 2);
  v_exchange_rate      numeric(12, 4);
  v_new_status          payment_status;
  v_sibling             record;
  v_sibling_paid        numeric(12, 2);
  v_sibling_price       numeric(12, 2);
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

  v_tip_amount := coalesce(p_tip_amount, 0);

  select * into v_service from public.services where id = v_appt.service_id;
  select * into v_employee_profile from public.profiles where id = v_appt.employee_id;

  v_effective_price := coalesce(v_appt.price_override, v_service.price);

  v_assistant_pct := coalesce(v_appt.assistant_percentage, 0);
  v_employee_pct := coalesce(
    v_appt.employee_percentage_override,
    v_employee_profile.pay_percentage,
    100 - v_service.local_percentage
  );
  v_local_pct := 100 - v_employee_pct - v_assistant_pct;

  -- Split: tip goes 100% to employee; commission on service amount only
  v_assistant_amount := round(p_amount * v_assistant_pct / 100, 2);
  v_employee_amount  := round(p_amount * v_employee_pct / 100, 2);
  v_local_amount     := round(p_amount - v_employee_amount - v_assistant_amount, 2);

  v_exchange_rate := coalesce(
    p_exchange_rate,
    (select b.ves_exchange_rate from public.branches b where b.id = v_appt.branch_id),
    (select bz.ves_exchange_rate from public.businesses bz where bz.id = v_appt.business_id),
    1
  );

  insert into public.transactions (
    business_id, branch_id, appointment_id,
    total_amount, local_amount, employee_amount, assistant_amount,
    local_percentage, employee_percentage, assistant_percentage,
    tip_amount,
    method, exchange_rate_used, payments_breakdown,
    created_by, notes
  )
  values (
    v_appt.business_id, v_appt.branch_id, p_appointment_id,
    p_amount, v_local_amount, v_employee_amount, v_assistant_amount,
    v_local_pct, v_employee_pct, v_assistant_pct,
    v_tip_amount,
    p_method, v_exchange_rate, p_payments_breakdown,
    auth.uid(), p_notes
  )
  returning id into v_tx_id;

  -- Update THIS appointment's payment_status
  select coalesce(sum(total_amount), 0) into v_paid_so_far
  from public.transactions
  where appointment_id = p_appointment_id;

  v_new_status := case
    when v_paid_so_far >= v_effective_price then 'paid'::payment_status
    when v_paid_so_far > 0                   then 'partial'::payment_status
    else                                           'unpaid'::payment_status
  end;

  -- Cascade payment_status to all siblings in the same group
  if v_appt.group_id is not null then
    for v_sibling in
      select * from public.appointments
      where group_id = v_appt.group_id
        and id != p_appointment_id
    loop
      -- Calculate total paid for this sibling
      select coalesce(sum(total_amount), 0) into v_sibling_paid
      from public.transactions
      where appointment_id = v_sibling.id;

      -- Calculate effective price for this sibling
      v_sibling_price := coalesce(
        v_sibling.price_override,
        (select price from public.services where id = v_sibling.service_id)
      );

      -- Set sibling's payment_status
      update public.appointments
      set payment_status = case
        when v_sibling_paid >= v_sibling_price then 'paid'::payment_status
        when v_sibling_paid > 0                 then 'partial'::payment_status
        else                                         'unpaid'::payment_status
      end
      where id = v_sibling.id;
    end loop;
  end if;

  -- Final update for the main appointment
  update public.appointments
  set payment_status = v_new_status
  where id = p_appointment_id;

  return v_tx_id;
end;
$$;


--
-- Name: record_sale(uuid, numeric, public.payment_method, jsonb, text, numeric, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_sale(p_appointment_id uuid, p_amount numeric, p_method public.payment_method DEFAULT 'cash'::public.payment_method, p_products jsonb DEFAULT '[]'::jsonb, p_notes text DEFAULT NULL::text, p_exchange_rate numeric DEFAULT NULL::numeric, p_payments_breakdown jsonb DEFAULT '[]'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: record_sale(uuid, numeric, public.payment_method, jsonb, text, numeric, jsonb, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_sale(p_appointment_id uuid, p_amount numeric, p_method public.payment_method DEFAULT 'cash'::public.payment_method, p_products jsonb DEFAULT '[]'::jsonb, p_notes text DEFAULT NULL::text, p_exchange_rate numeric DEFAULT NULL::numeric, p_payments_breakdown jsonb DEFAULT '[]'::jsonb, p_tip_amount numeric DEFAULT 0) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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
    p_exchange_rate, p_payments_breakdown, coalesce(p_tip_amount, 0)
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


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: sync_profile_email(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_profile_email() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
  update public.profiles
  set email = new.email, updated_at = now()
  where id = new.id;
  return new;
end;
$$;


--
-- Name: update_transaction(uuid, numeric, public.payment_method, text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_transaction(p_transaction_id uuid, p_amount numeric DEFAULT NULL::numeric, p_method public.payment_method DEFAULT NULL::public.payment_method, p_notes text DEFAULT NULL::text, p_exchange_rate numeric DEFAULT NULL::numeric) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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
  if v_tx.id is null then
    raise exception 'Transaction not found';
  end if;

  if not public.is_admin_of(v_tx.business_id) then
    raise exception 'Not authorized';
  end if;

  select * into v_appt from public.appointments where id = v_tx.appointment_id;

  v_new_amount := coalesce(p_amount, v_tx.total_amount);

  if v_new_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

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


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text,
    raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: appointment_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointment_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    appointment_id uuid NOT NULL,
    service_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    assistant_id uuid,
    assistant_percentage numeric(5,2) DEFAULT 0,
    price_applied numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    client_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    service_id uuid NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    status public.appointment_status DEFAULT 'pending'::public.appointment_status NOT NULL,
    payment_status public.payment_status DEFAULT 'unpaid'::public.payment_status NOT NULL,
    service_notes text,
    internal_notes text,
    reminder_sent_at timestamp with time zone,
    source public.appointment_source DEFAULT 'internal'::public.appointment_source NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    group_id uuid,
    price_override numeric(12,2),
    assistant_employee_id uuid,
    assistant_percentage numeric(5,2),
    employee_percentage_override numeric(5,2),
    branch_id uuid,
    duration_override numeric(6,2),
    CONSTRAINT appointments_check CHECK ((end_time > start_time))
);


--
-- Name: branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    name text NOT NULL,
    address text,
    phone text,
    is_default boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ves_exchange_rate numeric(12,4)
);


--
-- Name: cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache (
    key character varying(255) NOT NULL,
    value text NOT NULL,
    expiration bigint NOT NULL
);


--
-- Name: cache_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache_locks (
    key character varying(255) NOT NULL,
    owner character varying(255) NOT NULL,
    expiration bigint NOT NULL
);


--
-- Name: client_preferred_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_preferred_services (
    client_id uuid NOT NULL,
    service_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    full_name text NOT NULL,
    phone text NOT NULL,
    email text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    birthday date,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    branch_id uuid
);


--
-- Name: employee_absences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_absences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    type public.employee_absence_type DEFAULT 'blocked'::public.employee_absence_type NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    reason text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT employee_absences_check CHECK ((ends_at > starts_at))
);


--
-- Name: employee_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_method text DEFAULT 'cash'::text NOT NULL,
    notes text,
    payment_date date DEFAULT CURRENT_DATE NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    type text DEFAULT 'payment'::text NOT NULL,
    concept text,
    currency text DEFAULT 'USD'::text NOT NULL,
    original_amount numeric(12,2) DEFAULT 0 NOT NULL,
    exchange_rate_used numeric(12,4) DEFAULT 1.0000 NOT NULL,
    branch_id uuid,
    CONSTRAINT employee_payments_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: employee_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    weekday smallint NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid,
    CONSTRAINT employee_schedules_check CHECK ((end_time > start_time)),
    CONSTRAINT employee_schedules_weekday_check CHECK (((weekday >= 0) AND (weekday <= 6)))
);


--
-- Name: employee_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_services (
    employee_id uuid NOT NULL,
    service_id uuid NOT NULL
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    name text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    amount numeric(12,2) NOT NULL,
    expense_date date DEFAULT CURRENT_DATE NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    original_amount numeric(12,2) DEFAULT 0 NOT NULL,
    exchange_rate_used numeric(12,4) DEFAULT 1.0000 NOT NULL,
    branch_id uuid,
    CONSTRAINT expenses_amount_check CHECK ((amount >= (0)::numeric))
);


--
-- Name: failed_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.failed_jobs (
    id bigint NOT NULL,
    uuid character varying(255) NOT NULL,
    connection character varying(255) NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    exception text NOT NULL,
    failed_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: failed_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.failed_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: failed_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.failed_jobs_id_seq OWNED BY public.failed_jobs.id;


--
-- Name: gift_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gift_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    branch_id uuid,
    recipient_name text NOT NULL,
    recipient_phone text,
    amount numeric(12,2) NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    notes text,
    redeemed_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT gift_cards_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT gift_cards_status_check CHECK ((status = ANY (ARRAY['active'::text, 'redeemed'::text, 'cancelled'::text])))
);


--
-- Name: inventory_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    name text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid
);


--
-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    location_id uuid NOT NULL,
    product_id uuid NOT NULL,
    variant_id uuid,
    movement_type public.inventory_movement_type NOT NULL,
    quantity numeric(12,4) NOT NULL,
    unit_cost numeric(12,4) DEFAULT 0 NOT NULL,
    exchange_rate_used numeric(12,4) DEFAULT 1.0000 NOT NULL,
    reference_type text,
    reference_id uuid,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid,
    client_id uuid,
    CONSTRAINT inventory_movements_quantity_check CHECK ((quantity <> (0)::numeric))
);


--
-- Name: inventory_stock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_stock (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    location_id uuid NOT NULL,
    product_id uuid NOT NULL,
    variant_id uuid,
    quantity numeric(12,4) DEFAULT 0 NOT NULL,
    reserved_qty numeric(12,4) DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid,
    CONSTRAINT inventory_stock_quantity_check CHECK ((quantity >= (0)::numeric)),
    CONSTRAINT inventory_stock_reserved_qty_check CHECK ((reserved_qty >= (0)::numeric))
);


--
-- Name: job_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_batches (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    total_jobs integer NOT NULL,
    pending_jobs integer NOT NULL,
    failed_jobs integer NOT NULL,
    failed_job_ids text NOT NULL,
    options text,
    cancelled_at integer,
    created_at integer NOT NULL,
    finished_at integer
);


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs (
    id bigint NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    attempts smallint NOT NULL,
    reserved_at integer,
    available_at integer NOT NULL,
    created_at integer NOT NULL
);


--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    migration character varying(255) NOT NULL,
    batch integer NOT NULL
);


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    appointment_id uuid,
    client_name text,
    client_phone text,
    service_name text,
    appointment_time timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    created_at timestamp(0) without time zone
);


--
-- Name: personal_access_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personal_access_tokens (
    id bigint NOT NULL,
    tokenable_type character varying(255) NOT NULL,
    tokenable_id uuid NOT NULL,
    name text NOT NULL,
    token character varying(64) NOT NULL,
    abilities text,
    last_used_at timestamp(0) without time zone,
    expires_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.personal_access_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.personal_access_tokens_id_seq OWNED BY public.personal_access_tokens.id;


--
-- Name: product_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    parent_id uuid,
    name text NOT NULL,
    description text,
    active boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid
);


--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    name text NOT NULL,
    sku text,
    unit_cost numeric(12,4) DEFAULT 0 NOT NULL,
    unit_price numeric(12,4) DEFAULT 0 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid,
    CONSTRAINT product_variants_unit_cost_check CHECK ((unit_cost >= (0)::numeric)),
    CONSTRAINT product_variants_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    category_id uuid,
    name text NOT NULL,
    description text,
    sku text,
    barcode text,
    unit text DEFAULT 'unit'::text NOT NULL,
    unit_cost numeric(12,4) DEFAULT 0 NOT NULL,
    unit_price numeric(12,4) DEFAULT 0 NOT NULL,
    reorder_point numeric(12,4) DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    is_sellable boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid,
    CONSTRAINT products_reorder_point_check CHECK ((reorder_point >= (0)::numeric)),
    CONSTRAINT products_unit_cost_check CHECK ((unit_cost >= (0)::numeric)),
    CONSTRAINT products_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    business_id uuid,
    full_name text NOT NULL,
    role public.app_role DEFAULT 'empleado'::public.app_role NOT NULL,
    phone text,
    avatar_url text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    job_title text,
    pay_type text DEFAULT 'percentage'::text NOT NULL,
    pay_percentage numeric(5,2) DEFAULT 50 NOT NULL,
    base_salary numeric(12,2) DEFAULT 0 NOT NULL,
    email text,
    salary_frequency text DEFAULT 'monthly'::text NOT NULL,
    disable_agenda boolean DEFAULT false NOT NULL,
    CONSTRAINT profiles_base_salary_check CHECK ((base_salary >= (0)::numeric)),
    CONSTRAINT profiles_pay_percentage_check CHECK (((pay_percentage >= (0)::numeric) AND (pay_percentage <= (100)::numeric))),
    CONSTRAINT profiles_salary_frequency_check CHECK ((salary_frequency = ANY (ARRAY['weekly'::text, 'biweekly'::text, 'monthly'::text]))),
    CONSTRAINT profiles_tenant_required CHECK (((role = 'superadmin'::public.app_role) OR (business_id IS NOT NULL)))
);


--
-- Name: service_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    parent_id uuid,
    name text NOT NULL,
    description text,
    active boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: service_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    service_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    duration_minutes integer,
    price numeric(12,2),
    active boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    duration_minutes integer NOT NULL,
    price numeric(12,2) NOT NULL,
    local_percentage numeric(5,2) DEFAULT 50 NOT NULL,
    color text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    category text DEFAULT 'otros'::text NOT NULL,
    icon text,
    service_category_id uuid,
    branch_id uuid,
    CONSTRAINT services_duration_minutes_check CHECK ((duration_minutes > 0)),
    CONSTRAINT services_local_percentage_check CHECK (((local_percentage >= (0)::numeric) AND (local_percentage <= (100)::numeric))),
    CONSTRAINT services_price_check CHECK ((price >= (0)::numeric))
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id character varying(255) NOT NULL,
    user_id bigint,
    ip_address character varying(45),
    user_agent text,
    payload text NOT NULL,
    last_activity integer NOT NULL
);


--
-- Name: supplier_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    payment_method text DEFAULT 'cash'::text NOT NULL,
    payment_date date DEFAULT CURRENT_DATE NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid,
    CONSTRAINT supplier_payments_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text,
    company text,
    total_debt numeric(12,2) DEFAULT 0 NOT NULL,
    debt_currency text DEFAULT 'USD'::text NOT NULL,
    debt_original_amount numeric(12,2) DEFAULT 0 NOT NULL,
    debt_exchange_rate numeric(12,4) DEFAULT 1 NOT NULL,
    notes text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid,
    CONSTRAINT suppliers_debt_currency_check CHECK ((debt_currency = ANY (ARRAY['USD'::text, 'VES'::text]))),
    CONSTRAINT suppliers_debt_exchange_rate_check CHECK ((debt_exchange_rate > (0)::numeric)),
    CONSTRAINT suppliers_debt_original_amount_check CHECK ((debt_original_amount >= (0)::numeric)),
    CONSTRAINT suppliers_total_debt_check CHECK ((total_debt >= (0)::numeric))
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    appointment_id uuid NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    local_amount numeric(12,2) NOT NULL,
    employee_amount numeric(12,2) NOT NULL,
    assistant_amount numeric(12,2) DEFAULT 0 NOT NULL,
    local_percentage numeric(5,2) NOT NULL,
    employee_percentage numeric(5,2) NOT NULL,
    assistant_percentage numeric(5,2) DEFAULT 0 NOT NULL,
    method public.payment_method DEFAULT 'cash'::public.payment_method NOT NULL,
    exchange_rate_used numeric(12,4) DEFAULT 1.0000 NOT NULL,
    payments_breakdown jsonb DEFAULT '[]'::jsonb NOT NULL,
    paid_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid,
    tip_amount numeric(12,2) DEFAULT 0 NOT NULL,
    CONSTRAINT transactions_local_employee_assistant_equal_total CHECK ((round(((local_amount + employee_amount) + assistant_amount), 2) = round(total_amount, 2))),
    CONSTRAINT transactions_percentages_sum_100 CHECK ((round(((local_percentage + employee_percentage) + assistant_percentage), 2) = (100)::numeric))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    email_verified_at timestamp(0) without time zone,
    password character varying(255) NOT NULL,
    remember_token character varying(100),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: failed_jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs ALTER COLUMN id SET DEFAULT nextval('public.failed_jobs_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: personal_access_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_access_tokens ALTER COLUMN id SET DEFAULT nextval('public.personal_access_tokens_id_seq'::regclass);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: appointment_services appointment_services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_services
    ADD CONSTRAINT appointment_services_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: businesses businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);


--
-- Name: businesses businesses_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_slug_key UNIQUE (slug);


--
-- Name: cache_locks cache_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_locks
    ADD CONSTRAINT cache_locks_pkey PRIMARY KEY (key);


--
-- Name: cache cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache
    ADD CONSTRAINT cache_pkey PRIMARY KEY (key);


--
-- Name: client_preferred_services client_preferred_services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_preferred_services
    ADD CONSTRAINT client_preferred_services_pkey PRIMARY KEY (client_id, service_id);


--
-- Name: clients clients_business_id_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_business_id_phone_key UNIQUE (business_id, phone);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: employee_absences employee_absences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_absences
    ADD CONSTRAINT employee_absences_pkey PRIMARY KEY (id);


--
-- Name: employee_payments employee_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_payments
    ADD CONSTRAINT employee_payments_pkey PRIMARY KEY (id);


--
-- Name: employee_schedules employee_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_schedules
    ADD CONSTRAINT employee_schedules_pkey PRIMARY KEY (id);


--
-- Name: employee_services employee_services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_services
    ADD CONSTRAINT employee_services_pkey PRIMARY KEY (employee_id, service_id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_uuid_unique UNIQUE (uuid);


--
-- Name: gift_cards gift_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_cards
    ADD CONSTRAINT gift_cards_pkey PRIMARY KEY (id);


--
-- Name: inventory_locations inventory_locations_business_id_branch_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_locations
    ADD CONSTRAINT inventory_locations_business_id_branch_id_name_key UNIQUE (business_id, branch_id, name);


--
-- Name: inventory_locations inventory_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_locations
    ADD CONSTRAINT inventory_locations_pkey PRIMARY KEY (id);


--
-- Name: inventory_movements inventory_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);


--
-- Name: inventory_stock inventory_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_stock
    ADD CONSTRAINT inventory_stock_pkey PRIMARY KEY (id);


--
-- Name: job_batches job_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_batches
    ADD CONSTRAINT job_batches_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (email);


--
-- Name: personal_access_tokens personal_access_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_pkey PRIMARY KEY (id);


--
-- Name: personal_access_tokens personal_access_tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_token_unique UNIQUE (token);


--
-- Name: product_categories product_categories_business_id_branch_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_business_id_branch_id_name_key UNIQUE (business_id, branch_id, name);


--
-- Name: product_categories product_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_product_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_name_key UNIQUE (product_id, name);


--
-- Name: products products_business_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_business_id_name_key UNIQUE (business_id, name);


--
-- Name: products products_business_id_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_business_id_sku_key UNIQUE (business_id, sku);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: service_categories service_categories_business_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_business_id_name_key UNIQUE (business_id, name);


--
-- Name: service_categories service_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_pkey PRIMARY KEY (id);


--
-- Name: service_variants service_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_variants
    ADD CONSTRAINT service_variants_pkey PRIMARY KEY (id);


--
-- Name: service_variants service_variants_service_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_variants
    ADD CONSTRAINT service_variants_service_id_name_key UNIQUE (service_id, name);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: supplier_payments supplier_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: appointments_business_start_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX appointments_business_start_idx ON public.appointments USING btree (business_id, start_time);


--
-- Name: appointments_client_start_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX appointments_client_start_idx ON public.appointments USING btree (client_id, start_time DESC);


--
-- Name: appointments_employee_start_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX appointments_employee_start_idx ON public.appointments USING btree (employee_id, start_time);


--
-- Name: appointments_group_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX appointments_group_id_idx ON public.appointments USING btree (group_id);


--
-- Name: appointments_reminder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX appointments_reminder_idx ON public.appointments USING btree (start_time) WHERE ((reminder_sent_at IS NULL) AND (status = ANY (ARRAY['pending'::public.appointment_status, 'confirmed'::public.appointment_status])));


--
-- Name: appointments_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX appointments_status_idx ON public.appointments USING btree (business_id, status);


--
-- Name: appt_svc_appointment_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX appt_svc_appointment_idx ON public.appointment_services USING btree (appointment_id);


--
-- Name: appt_svc_employee_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX appt_svc_employee_idx ON public.appointment_services USING btree (employee_id);


--
-- Name: branches_business_id_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX branches_business_id_name_key ON public.branches USING btree (business_id, name) WHERE (active = true);


--
-- Name: branches_business_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX branches_business_idx ON public.branches USING btree (business_id);


--
-- Name: businesses_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX businesses_slug_idx ON public.businesses USING btree (slug);


--
-- Name: cache_expiration_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cache_expiration_index ON public.cache USING btree (expiration);


--
-- Name: cache_locks_expiration_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cache_locks_expiration_index ON public.cache_locks USING btree (expiration);


--
-- Name: client_preferred_services_branch_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_preferred_services_branch_idx ON public.client_preferred_services USING btree (branch_id);


--
-- Name: client_preferred_services_service_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_preferred_services_service_idx ON public.client_preferred_services USING btree (service_id);


--
-- Name: clients_branch_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clients_branch_idx ON public.clients USING btree (branch_id);


--
-- Name: clients_business_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clients_business_idx ON public.clients USING btree (business_id);


--
-- Name: clients_phone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clients_phone_idx ON public.clients USING btree (business_id, phone);


--
-- Name: employee_absences_business_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employee_absences_business_idx ON public.employee_absences USING btree (business_id);


--
-- Name: employee_absences_employee_range_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employee_absences_employee_range_idx ON public.employee_absences USING btree (employee_id, starts_at, ends_at);


--
-- Name: employee_payments_branch_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employee_payments_branch_idx ON public.employee_payments USING btree (branch_id);


--
-- Name: employee_schedules_employee_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employee_schedules_employee_idx ON public.employee_schedules USING btree (employee_id, weekday);


--
-- Name: employee_services_service_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employee_services_service_idx ON public.employee_services USING btree (service_id);


--
-- Name: expenses_business_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expenses_business_date_idx ON public.expenses USING btree (business_id, expense_date DESC);


--
-- Name: failed_jobs_connection_queue_failed_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX failed_jobs_connection_queue_failed_at_index ON public.failed_jobs USING btree (connection, queue, failed_at);


--
-- Name: idx_businesses_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_businesses_active ON public.businesses USING btree (id) WHERE (deleted_at IS NULL);


--
-- Name: idx_employee_payments_business; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_payments_business ON public.employee_payments USING btree (business_id);


--
-- Name: idx_employee_payments_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_payments_date ON public.employee_payments USING btree (payment_date);


--
-- Name: idx_employee_payments_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_payments_employee ON public.employee_payments USING btree (employee_id);


--
-- Name: idx_gift_cards_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_cards_business_id ON public.gift_cards USING btree (business_id);


--
-- Name: idx_gift_cards_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_cards_status ON public.gift_cards USING btree (business_id, status);


--
-- Name: idx_notifications_business; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_business ON public.notifications USING btree (business_id);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (profile_id, is_read, created_at DESC) WHERE (is_read = false);


--
-- Name: idx_supplier_payments_business; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_payments_business ON public.supplier_payments USING btree (business_id);


--
-- Name: idx_supplier_payments_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_payments_date ON public.supplier_payments USING btree (payment_date);


--
-- Name: idx_supplier_payments_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_payments_supplier ON public.supplier_payments USING btree (supplier_id);


--
-- Name: idx_suppliers_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suppliers_active ON public.suppliers USING btree (business_id, active);


--
-- Name: idx_suppliers_business; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suppliers_business ON public.suppliers USING btree (business_id);


--
-- Name: inventory_locations_branch_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_locations_branch_idx ON public.inventory_locations USING btree (branch_id);


--
-- Name: inventory_locations_business_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_locations_business_idx ON public.inventory_locations USING btree (business_id);


--
-- Name: inventory_movements_business_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_movements_business_idx ON public.inventory_movements USING btree (business_id, created_at DESC);


--
-- Name: inventory_movements_client_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_movements_client_id_idx ON public.inventory_movements USING btree (client_id);


--
-- Name: inventory_movements_product_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_movements_product_idx ON public.inventory_movements USING btree (product_id);


--
-- Name: inventory_stock_business_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_stock_business_idx ON public.inventory_stock USING btree (business_id);


--
-- Name: inventory_stock_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX inventory_stock_unique_idx ON public.inventory_stock USING btree (branch_id, location_id, product_id, variant_id);


--
-- Name: jobs_queue_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jobs_queue_index ON public.jobs USING btree (queue);


--
-- Name: personal_access_tokens_expires_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX personal_access_tokens_expires_at_index ON public.personal_access_tokens USING btree (expires_at);


--
-- Name: personal_access_tokens_tokenable_type_tokenable_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX personal_access_tokens_tokenable_type_tokenable_id_index ON public.personal_access_tokens USING btree (tokenable_type, tokenable_id);


--
-- Name: product_categories_branch_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_categories_branch_idx ON public.product_categories USING btree (branch_id);


--
-- Name: product_categories_business_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_categories_business_idx ON public.product_categories USING btree (business_id);


--
-- Name: product_categories_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_categories_parent_idx ON public.product_categories USING btree (parent_id);


--
-- Name: product_variants_branch_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_variants_branch_idx ON public.product_variants USING btree (branch_id);


--
-- Name: product_variants_product_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_variants_product_idx ON public.product_variants USING btree (product_id);


--
-- Name: products_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_active_idx ON public.products USING btree (business_id, active);


--
-- Name: products_branch_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_branch_idx ON public.products USING btree (branch_id);


--
-- Name: products_business_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_business_idx ON public.products USING btree (business_id);


--
-- Name: products_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_category_idx ON public.products USING btree (category_id);


--
-- Name: products_sellable_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_sellable_idx ON public.products USING btree (business_id, is_sellable) WHERE (is_sellable = true);


--
-- Name: profiles_business_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profiles_business_id_idx ON public.profiles USING btree (business_id);


--
-- Name: profiles_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profiles_email_idx ON public.profiles USING btree (email);


--
-- Name: profiles_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profiles_role_idx ON public.profiles USING btree (role);


--
-- Name: service_categories_business_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX service_categories_business_idx ON public.service_categories USING btree (business_id);


--
-- Name: service_categories_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX service_categories_parent_idx ON public.service_categories USING btree (parent_id);


--
-- Name: service_variants_business_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX service_variants_business_idx ON public.service_variants USING btree (business_id);


--
-- Name: service_variants_service_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX service_variants_service_idx ON public.service_variants USING btree (service_id);


--
-- Name: services_branch_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX services_branch_idx ON public.services USING btree (branch_id);


--
-- Name: services_business_category_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX services_business_category_active_idx ON public.services USING btree (business_id, category, active);


--
-- Name: services_business_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX services_business_idx ON public.services USING btree (business_id);


--
-- Name: services_service_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX services_service_category_idx ON public.services USING btree (service_category_id);


--
-- Name: sessions_last_activity_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_last_activity_index ON public.sessions USING btree (last_activity);


--
-- Name: sessions_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_user_id_index ON public.sessions USING btree (user_id);


--
-- Name: supplier_payments_branch_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX supplier_payments_branch_idx ON public.supplier_payments USING btree (branch_id);


--
-- Name: suppliers_branch_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX suppliers_branch_idx ON public.suppliers USING btree (branch_id);


--
-- Name: transactions_appointment_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transactions_appointment_idx ON public.transactions USING btree (appointment_id);


--
-- Name: transactions_business_paid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transactions_business_paid_idx ON public.transactions USING btree (business_id, paid_at DESC);


--
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


--
-- Name: users on_auth_user_email_change; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER on_auth_user_email_change AFTER UPDATE OF email ON auth.users FOR EACH ROW WHEN ((old.email IS DISTINCT FROM new.email)) EXECUTE FUNCTION public.sync_profile_email();


--
-- Name: appointments appointments_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER appointments_set_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: branches branches_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER branches_set_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: businesses businesses_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER businesses_set_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: appointments check_employee_overlap_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_employee_overlap_trigger BEFORE INSERT OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.check_employee_overlap();


--
-- Name: clients clients_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER clients_set_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: employee_absences employee_absences_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER employee_absences_set_updated_at BEFORE UPDATE ON public.employee_absences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: employee_payments employee_payments_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER employee_payments_set_updated_at BEFORE UPDATE ON public.employee_payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: expenses expenses_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER expenses_set_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: gift_cards gift_cards_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER gift_cards_set_updated_at BEFORE UPDATE ON public.gift_cards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: inventory_locations inventory_locations_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER inventory_locations_set_updated_at BEFORE UPDATE ON public.inventory_locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: inventory_stock inventory_stock_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER inventory_stock_set_updated_at BEFORE UPDATE ON public.inventory_stock FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: product_categories product_categories_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER product_categories_set_updated_at BEFORE UPDATE ON public.product_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: product_variants product_variants_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER product_variants_set_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: products products_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER products_set_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: profiles profiles_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: service_categories service_categories_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER service_categories_set_updated_at BEFORE UPDATE ON public.service_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: service_variants service_variants_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER service_variants_set_updated_at BEFORE UPDATE ON public.service_variants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: services services_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER services_set_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: supplier_payments supplier_payments_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER supplier_payments_set_updated_at BEFORE UPDATE ON public.supplier_payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: suppliers suppliers_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER suppliers_set_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: businesses trg_create_default_branch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_create_default_branch AFTER INSERT ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.create_default_branch();


--
-- Name: appointments trg_new_appointment_notification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_new_appointment_notification AFTER INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.fn_notify_new_appointment();


--
-- Name: appointments trg_status_change_notification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_status_change_notification AFTER UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.fn_notify_status_change();


--
-- Name: appointment_services appointment_services_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_services
    ADD CONSTRAINT appointment_services_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;


--
-- Name: appointment_services appointment_services_assistant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_services
    ADD CONSTRAINT appointment_services_assistant_id_fkey FOREIGN KEY (assistant_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: appointment_services appointment_services_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_services
    ADD CONSTRAINT appointment_services_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: appointment_services appointment_services_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_services
    ADD CONSTRAINT appointment_services_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE RESTRICT;


--
-- Name: appointments appointments_assistant_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_assistant_employee_id_fkey FOREIGN KEY (assistant_employee_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: appointments appointments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: appointments appointments_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT;


--
-- Name: appointments appointments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: appointments appointments_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: appointments appointments_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE RESTRICT;


--
-- Name: branches branches_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: client_preferred_services client_preferred_services_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_preferred_services
    ADD CONSTRAINT client_preferred_services_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: client_preferred_services client_preferred_services_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_preferred_services
    ADD CONSTRAINT client_preferred_services_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: client_preferred_services client_preferred_services_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_preferred_services
    ADD CONSTRAINT client_preferred_services_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: clients clients_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: clients clients_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: employee_absences employee_absences_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_absences
    ADD CONSTRAINT employee_absences_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: employee_absences employee_absences_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_absences
    ADD CONSTRAINT employee_absences_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: employee_absences employee_absences_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_absences
    ADD CONSTRAINT employee_absences_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: employee_payments employee_payments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_payments
    ADD CONSTRAINT employee_payments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: employee_payments employee_payments_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_payments
    ADD CONSTRAINT employee_payments_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: employee_payments employee_payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_payments
    ADD CONSTRAINT employee_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: employee_payments employee_payments_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_payments
    ADD CONSTRAINT employee_payments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: employee_schedules employee_schedules_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_schedules
    ADD CONSTRAINT employee_schedules_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: employee_schedules employee_schedules_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_schedules
    ADD CONSTRAINT employee_schedules_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: employee_services employee_services_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_services
    ADD CONSTRAINT employee_services_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: employee_services employee_services_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_services
    ADD CONSTRAINT employee_services_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: gift_cards gift_cards_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_cards
    ADD CONSTRAINT gift_cards_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: gift_cards gift_cards_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_cards
    ADD CONSTRAINT gift_cards_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: gift_cards gift_cards_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_cards
    ADD CONSTRAINT gift_cards_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: inventory_locations inventory_locations_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_locations
    ADD CONSTRAINT inventory_locations_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: inventory_locations inventory_locations_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_locations
    ADD CONSTRAINT inventory_locations_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: inventory_movements inventory_movements_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: inventory_movements inventory_movements_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: inventory_movements inventory_movements_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: inventory_movements inventory_movements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: inventory_movements inventory_movements_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.inventory_locations(id) ON DELETE CASCADE;


--
-- Name: inventory_movements inventory_movements_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: inventory_movements inventory_movements_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- Name: inventory_stock inventory_stock_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_stock
    ADD CONSTRAINT inventory_stock_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: inventory_stock inventory_stock_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_stock
    ADD CONSTRAINT inventory_stock_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: inventory_stock inventory_stock_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_stock
    ADD CONSTRAINT inventory_stock_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.inventory_locations(id) ON DELETE CASCADE;


--
-- Name: inventory_stock inventory_stock_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_stock
    ADD CONSTRAINT inventory_stock_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: inventory_stock inventory_stock_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_stock
    ADD CONSTRAINT inventory_stock_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: product_categories product_categories_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: product_categories product_categories_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: product_categories product_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.product_categories(id) ON DELETE SET NULL;


--
-- Name: product_variants product_variants_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: products products_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.product_categories(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: service_categories service_categories_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: service_categories service_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.service_categories(id) ON DELETE SET NULL;


--
-- Name: service_variants service_variants_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_variants
    ADD CONSTRAINT service_variants_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: service_variants service_variants_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_variants
    ADD CONSTRAINT service_variants_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: services services_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: services services_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: services services_service_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_service_category_id_fkey FOREIGN KEY (service_category_id) REFERENCES public.service_categories(id) ON DELETE SET NULL;


--
-- Name: supplier_payments supplier_payments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: supplier_payments supplier_payments_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: supplier_payments supplier_payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: supplier_payments supplier_payments_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: suppliers suppliers_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: suppliers suppliers_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE RESTRICT;


--
-- Name: transactions transactions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: notifications Usuarios actualizan sus propias notificaciones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuarios actualizan sus propias notificaciones" ON public.notifications FOR UPDATE USING ((profile_id = auth.uid()));


--
-- Name: notifications Usuarios ven sus propias notificaciones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuarios ven sus propias notificaciones" ON public.notifications FOR SELECT USING ((profile_id = auth.uid()));


--
-- Name: notifications notifications_insert_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_insert_admin ON public.notifications FOR INSERT WITH CHECK (public.is_admin_of(business_id));


--
-- PostgreSQL database dump complete
--

\unrestrict lJcIJKifPLb4xCNtsJvIdNIVenFANc1yIDnn32azEGdOqcAmUG7dQDH7fpdvdee

