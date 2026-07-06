-- PostgREST setup: authenticator role + JWT secret config
do $$ begin
    create role authenticator with login password 'localpass' noinherit;
exception when duplicate_object then null; end $$;

grant anon, authenticated to authenticator;

-- Grant schema access for authenticator
grant usage on schema public, auth to authenticator;
grant all on all tables in schema public to authenticator;
grant all on all sequences in schema public to authenticator;
grant all on all routines in schema public to authenticator;

-- Notify PostgREST of schema changes
notify pgrst, 'reload schema';
