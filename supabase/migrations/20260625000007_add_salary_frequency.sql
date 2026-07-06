-- =============================================================================
-- Add salary_frequency to profiles: weekly, biweekly, or monthly
-- =============================================================================

-- 1. Add column to profiles
alter table public.profiles
  add column if not exists salary_frequency text not null default 'monthly'
  check (salary_frequency in ('weekly', 'biweekly', 'monthly'));

-- 2. Update handle_new_user trigger to include salary_frequency
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (
    id, business_id, full_name, role, phone, avatar_url,
    job_title, pay_type, pay_percentage, base_salary, salary_frequency,
    active, email
  )
  values (
    new.id,
    (new.raw_user_meta_data->>'business_id')::uuid,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
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
    coalesce(nullif(new.raw_user_meta_data->>'pay_type', ''), 'percentage'),
    coalesce((new.raw_user_meta_data->>'pay_percentage')::numeric, 50),
    coalesce((new.raw_user_meta_data->>'base_salary')::numeric, 0),
    coalesce(nullif(new.raw_user_meta_data->>'salary_frequency', ''), 'monthly'),
    true,
    new.email
  );
  return new;
end;
$$;
