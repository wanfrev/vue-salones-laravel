-- =============================================================================
-- Agrega columna email a profiles y la sincroniza con auth.users
-- =============================================================================

-- 1. Agregar columna email
alter table public.profiles
  add column if not exists email text;

-- 2. Poblar emails existentes desde auth.users
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and p.email is null;

-- 3. Actualizar el trigger de auto-creación para incluir email
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (
    id,
    business_id,
    full_name,
    role,
    phone,
    avatar_url,
    job_title,
    pay_type,
    pay_percentage,
    base_salary,
    email,
    active
  )
  values (
    new.id,
    (new.raw_user_meta_data->>'business_id')::uuid,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      split_part(new.email, '@', 1)
    ),
    coalesce(
      (new.raw_user_meta_data->>'role')::app_role,
      case
        when new.raw_user_meta_data->>'business_id' is null then 'superadmin'::app_role
        else 'empleado'::app_role
      end
    ),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'job_title',
    coalesce(new.raw_user_meta_data->>'pay_type', 'percentage'),
    coalesce((new.raw_user_meta_data->>'pay_percentage')::numeric, 0),
    coalesce((new.raw_user_meta_data->>'base_salary')::numeric, 0),
    new.email,
    true
  );
  return new;
end;
$$;

-- 4. Trigger para sincronizar cambios de email desde auth.users
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.profiles
  set email = new.email, updated_at = now()
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_change on auth.users;
create trigger on_auth_user_email_change
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute procedure public.sync_profile_email();

-- 5. Índice para búsqueda por email
create index if not exists profiles_email_idx on public.profiles(email);
