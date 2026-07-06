-- Soft delete para negocios: permite "eliminar" un negocio sin perder datos
-- financieros/históricos, y evita mantener listas de tablas en Edge Functions.

alter table public.businesses
  add column if not exists deleted_at timestamptz;

comment on column public.businesses.deleted_at is 'Si tiene fecha, el negocio fue eliminado lógicamente.';

-- Índice parcial para acelerar queries de negocios activos
create index if not exists idx_businesses_active
  on public.businesses(id)
  where deleted_at is null;

-- Función auxiliar: solo negocios activos
create or replace function public.active_businesses()
returns setof public.businesses
language sql
stable
as $$
  select * from public.businesses where deleted_at is null;
$$;

-- Actualizar función pública para excluir negocios eliminados lógicamente
drop function if exists public.public_business_info(text);

create or replace function public.public_business_info(p_slug text)
returns table (
  id            uuid,
  name          text,
  timezone      text,
  currency      text,
  niche_type    text,
  theme_config  jsonb,
  terminology   jsonb,
  phone         text,
  address       text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select b.id, b.name, b.timezone, b.currency, b.niche_type, b.theme_config, b.terminology, b.phone, b.address
  from public.businesses b
  where b.slug = p_slug and b.active = true and b.deleted_at is null;
$$;
