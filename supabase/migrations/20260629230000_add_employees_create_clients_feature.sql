-- Add employees_create_clients feature flag (default: true)
-- When OFF, employees can only select existing clients in appointments, not create new ones.

alter table public.businesses
  alter column features set default '{
    "pos": true,
    "inventario": true,
    "productos": true,
    "proveedores": true,
    "multi_branch": false,
    "employees_create_clients": true
  }'::jsonb;
