-- =============================================================================
-- Add business theming/terminology config + client metadata
-- =============================================================================

alter table public.businesses
  add column if not exists niche_type text not null default 'salon',
  add column if not exists theme_config jsonb not null
    default '{"primary":"#2F4156","secondary":"#567CB0"}'::jsonb,
  add column if not exists terminology jsonb not null
    default '{"client":"Cliente","employee":"Empleado","service":"Servicio","appointment":"Cita","staff":"Personal","pet":"Mascota","owner":"Dueño","breed":"Raza","weight":"Peso","vaccines":"Vacunas"}'::jsonb;

alter table public.clients
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Migrate primary_color into theme_config.primary before dropping the column.
update public.businesses
set theme_config = jsonb_set(theme_config, '{primary}', to_jsonb(primary_color), true)
where primary_color is not null;

alter table public.businesses
  drop column if exists primary_color;

-- Update public business info for booking pages.
-- Drop existing function first because we are changing the return signature
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
  where b.slug = p_slug and b.active = true;
$$;

grant execute on function public.public_business_info(text) to anon, authenticated;
