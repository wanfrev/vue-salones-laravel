-- Disable RLS on all tables for local development
do $$
declare
    r record;
begin
    for r in select tablename from pg_tables where schemaname = 'public' and rowsecurity = true
    loop
        execute format('alter table public.%I disable row level security', r.tablename);
    end loop;
end $$;
