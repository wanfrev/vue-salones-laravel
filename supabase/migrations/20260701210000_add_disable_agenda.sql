-- Agregar flag para desactivar la agenda a un empleado
alter table public.profiles
  add column if not exists disable_agenda boolean not null default false;
