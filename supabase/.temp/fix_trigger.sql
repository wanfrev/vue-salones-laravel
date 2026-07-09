CREATE OR REPLACE FUNCTION public.create_default_branch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
begin
  if not exists (select 1 from public.branches where business_id = new.id and name = new.name || ' — Principal') then
    insert into public.branches (business_id, name, is_default)
    values (new.id, new.name || ' — Principal', true);
  end if;
  return new;
end;
$$;
