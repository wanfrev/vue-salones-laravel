alter table if exists public.businesses
  add column if not exists service_categories jsonb not null default '[]'::jsonb;
