-- =============================================================================
-- Feature flags per business (JSONB)
-- =============================================================================
-- Superadmin can enable/disable optional modules per business.
-- Core modules (clientes, servicios, equipo, finanzas, agenda) are always ON.
-- Optional modules default to ON for all businesses except multi_branch.

alter table public.businesses
  add column if not exists features jsonb not null default '{
    "pos": true,
    "inventario": true,
    "productos": true,
    "proveedores": true,
    "multi_branch": false
  }'::jsonb;

comment on column public.businesses.features is
  'Feature flags: pos, inventario, productos, proveedores, multi_branch';
