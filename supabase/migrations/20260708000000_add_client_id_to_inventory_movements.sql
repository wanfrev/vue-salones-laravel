alter table public.inventory_movements
  add column if not exists client_id uuid references public.clients(id) on delete set null;

create index if not exists inventory_movements_client_id_idx
  on public.inventory_movements(client_id);
