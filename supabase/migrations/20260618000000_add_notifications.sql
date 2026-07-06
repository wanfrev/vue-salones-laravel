-- ============================================================
-- Unified notifications table + triggers + migrate existing data
-- ============================================================

-- 1. Create unified notifications table
create table public.notifications (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses(id) on delete cascade,
  profile_id       uuid not null references public.profiles(id) on delete cascade,
  type             text not null,  -- 'reminder', 'status_change', 'new_appointment', 'unpaid_alert'
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

-- 2. Indexes
create index idx_notifications_unread
  on public.notifications(profile_id, is_read, created_at desc)
  where is_read = false;

create index idx_notifications_business
  on public.notifications(business_id);

-- 3. RLS
alter table public.notifications enable row level security;

create policy "Usuarios ven sus propias notificaciones"
  on public.notifications for select
  using (profile_id = auth.uid());

create policy "Usuarios actualizan sus propias notificaciones"
  on public.notifications for update
  using (profile_id = auth.uid());

create policy "Triggers y edge functions pueden insertar"
  on public.notifications for insert
  with check (true);

-- 4. Migrate data from reminder_notifications
insert into public.notifications
  (business_id, profile_id, type, title, message, appointment_id,
   client_name, client_phone, service_name, appointment_time,
   is_read, read_at, created_at)
select
  business_id, profile_id, 'reminder',
  'Recordatorio de cita',
  format('El cliente %s tiene cita de %s', client_name, service_name),
  appointment_id,
  client_name, client_phone, service_name, appointment_time,
  was_sent, dismissed_at, created_at
from public.reminder_notifications;

-- 5. Drop old table
drop table public.reminder_notifications;

-- ============================================================
-- Trigger: new appointment → notify assigned employee
-- ============================================================
create or replace function fn_notify_new_appointment()
returns trigger as $$
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
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_new_appointment_notification
  after insert on public.appointments
  for each row execute function fn_notify_new_appointment();

-- ============================================================
-- Trigger: status change → notify assigned employee
-- ============================================================
create or replace function fn_notify_status_change()
returns trigger as $$
declare
  status_label text;
  message_text text;
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
      format('%s — %s (%s)', c.full_name, s.name, status_label),
      new.id, c.full_name, c.phone, s.name, new.start_time
    from public.clients c, public.services s
    where c.id = new.client_id and s.id = new.service_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_status_change_notification
  after update on public.appointments
  for each row execute function fn_notify_status_change();
