-- Fix auth mock + create roles
create or replace function auth.uid() returns uuid language sql stable as $$
    select coalesce(current_setting('request.jwt.claim.sub', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid);
$$;

do $$ begin
    create role anon;
exception when duplicate_object then null; end $$;

do $$ begin
    create role authenticated;
exception when duplicate_object then null; end $$;

do $$ begin
    create role service_role;
exception when duplicate_object then null; end $$;

grant anon to authenticated;
grant authenticated to service_role;

-- Grant usage on public schema
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant all on all routines in schema public to anon, authenticated;
