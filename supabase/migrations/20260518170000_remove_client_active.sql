-- Elimina la columna active de clients (sin utilidad en el sistema)
alter table public.clients
  drop column if exists active;

drop index if exists clients_business_active_idx;
