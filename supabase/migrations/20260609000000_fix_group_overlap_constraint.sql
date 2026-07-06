-- Replace the GiST exclusion constraint with a trigger that allows
-- overlapping appointments within the same group (multi-service booking).
-- Single-service appointments (null group_id) are still blocked from overlapping.

alter table public.appointments
  drop constraint if exists appointments_no_employee_overlap;

create or replace function public.check_employee_overlap()
returns trigger as $$
begin
  if new.status not in ('pending', 'confirmed', 'completed') then
    return new;
  end if;

  if exists (
    select 1 from public.appointments a
    where a.id != new.id
      and a.employee_id = new.employee_id
      and a.status in ('pending', 'confirmed', 'completed')
      and tstzrange(a.start_time, a.end_time, '[)') && tstzrange(new.start_time, new.end_time, '[)')
      and (a.group_id is null or new.group_id is null or a.group_id != new.group_id)
  ) then
    raise exception 'El empleado ya tiene una cita en ese horario.' using errcode = '23P01';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists check_employee_overlap_trigger on public.appointments;
create trigger check_employee_overlap_trigger
  before insert or update on public.appointments
  for each row execute function public.check_employee_overlap();
