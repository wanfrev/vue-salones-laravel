-- Schema auth mínimo para desarrollo local sin Supabase
create schema if not exists auth;

create table if not exists auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);

create or replace function auth.uid() returns uuid language sql stable as $$
    select coalesce(current_setting('request.jwt.claim.sub', true)::uuid, null);
$$;

create or replace function auth.email() returns text language sql stable as $$
    select current_setting('request.jwt.claim.email', true);
$$;

create or replace function auth.role() returns text language sql stable as $$
    select current_setting('request.jwt.claim.role', true);
$$;
