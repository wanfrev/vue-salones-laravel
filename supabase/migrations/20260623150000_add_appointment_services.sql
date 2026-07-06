-- =============================================================================
-- Pivot table: 1 appointment → N services
-- =============================================================================
-- Before: appointments.service_id (one-to-one) forced one service per appointment.
-- The frontend already supports multiple services via group_id, but the DB
-- doesn't reflect the real-world workflow where a client gets multiple services
-- in a single visit (e.g., Mechas + Secado + Cejas).
--
-- This table allows each service within an appointment to have its own:
--   - assigned employee (who did that specific service)
--   - optional assistant with their own percentage
--   - price applied (frozen at booking time)
--
-- Backward compatibility: the existing columns on appointments (service_id,
-- employee_id, assistant_employee_id, assistant_percentage, price_override)
-- are KEPT for now so the frontend continues working. They can be dropped
-- once all code migrates to the pivot table.

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

comment on table public.appointment_services is 'Services performed within a single appointment visit';
comment on column public.appointment_services.employee_id is 'The stylist/employee who performed this specific service';
comment on column public.appointment_services.assistant_id is 'Optional assistant for this specific service';
comment on column public.appointment_services.price_applied is 'Price at moment of booking (frozen in time)';

create index if not exists appt_svc_appointment_idx
  on public.appointment_services(appointment_id);

create index if not exists appt_svc_employee_idx
  on public.appointment_services(employee_id);

-- Backfill: for every existing appointment that has a service_id, create a
-- corresponding row in appointment_services copying the primary employee,
-- assistant, and price override.
insert into public.appointment_services
  (appointment_id, service_id, employee_id, assistant_id, assistant_percentage, price_applied)
select
  a.id,
  a.service_id,
  a.employee_id,
  a.assistant_employee_id,
  coalesce(a.assistant_percentage, 0),
  coalesce(a.price_override, s.price)
from public.appointments a
join public.services s on s.id = a.service_id
where a.service_id is not null
  and not exists (
    select 1 from public.appointment_services aps where aps.appointment_id = a.id
  );

-- Enable RLS
alter table public.appointment_services enable row level security;

-- Admins can manage appointment_services for their own business
create policy "appointment_services_admin" on public.appointment_services
  for all to authenticated
  using (public.is_admin_of(
    (select business_id from public.appointments where id = appointment_id)
  ));

-- Employees can see appointment_services for their business
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
