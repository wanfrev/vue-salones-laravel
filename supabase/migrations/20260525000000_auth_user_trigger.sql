-- =============================================================================
-- Sistema de Salones — Trigger para auto-creación de profiles
-- =============================================================================
-- Cada vez que se crea un usuario en auth.users (vía admin.createUser(),
-- signUp, o inviteUserByEmail), este trigger inserta automáticamente la
-- fila correspondiente en public.profiles usando los datos de
-- raw_user_meta_data. Esto asegura que NUNCA haya un usuario de Auth sin
-- su perfil, eliminando el error 406 al hacer login.
-- =============================================================================

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
    true
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
