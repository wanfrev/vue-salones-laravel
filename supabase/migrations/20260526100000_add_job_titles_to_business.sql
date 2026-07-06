alter table if exists public.businesses
  add column if not exists job_titles jsonb not null default '[]'::jsonb;
