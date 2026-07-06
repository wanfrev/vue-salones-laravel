-- =============================================================================
-- Multi-branch feature toggle per business
-- =============================================================================
-- Not all businesses need multiple locations. Superadmin can enable/disable
-- this feature per business (e.g., premium feature / higher-tier plan).

alter table public.businesses
  add column if not exists multi_branch_enabled boolean not null default false;

comment on column public.businesses.multi_branch_enabled is
  'Superadmin-controlled flag: enables multi-sucursal UI and branch management';
