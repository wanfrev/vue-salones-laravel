create table public.reminder_notifications (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses(id) on delete cascade,
  appointment_id   uuid not null references public.appointments(id) on delete cascade,
  profile_id       uuid not null references public.profiles(id) on delete cascade,
  client_name      text not null,
  client_phone     text not null,
  service_name     text not null,
  appointment_time timestamptz not null,
  was_sent         boolean not null default false,
  dismissed_at     timestamptz,
  created_at       timestamptz not null default now()
);

create index idx_reminders_pending
  on public.reminder_notifications(profile_id, was_sent, dismissed_at)
  where was_sent = false and dismissed_at is null;

create index idx_reminders_appointment
  on public.reminder_notifications(appointment_id);

alter table public.reminder_notifications enable row level security;

create policy "Usuarios ven solo sus propios recordatorios"
  on public.reminder_notifications for select
  using (profile_id = auth.uid());

create policy "Usuarios actualizan solo sus propios recordatorios"
  on public.reminder_notifications for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "Edge function puede insertar libremente"
  on public.reminder_notifications for insert
  with check (true);
