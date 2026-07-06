-- Add group_id to appointments for simultaneous (grouped) bookings.
-- Multiple appointments sharing the same group_id are part of one
-- simultaneous booking (e.g., client gets nails + haircut at same time
-- from different employees).

alter table public.appointments
  add column if not exists group_id uuid;

create index if not exists appointments_group_id_idx
  on public.appointments(group_id);
