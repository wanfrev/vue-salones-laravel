-- Backfill transactions that should use per-appointment employee override.
-- Fixes historical rows where employee_percentage was stored with another value
-- (e.g. profile percentage) even when appointments.employee_percentage_override was set.

update public.transactions t
set
  employee_percentage = a.employee_percentage_override,
  local_percentage = round(100 - a.employee_percentage_override - coalesce(t.assistant_percentage, 0), 2),
  employee_amount = round(t.total_amount * (a.employee_percentage_override / 100), 2),
  local_amount = round(
    t.total_amount
    - round(t.total_amount * (a.employee_percentage_override / 100), 2)
    - coalesce(t.assistant_amount, 0),
    2
  )
from public.appointments a
where t.appointment_id = a.id
  and a.employee_percentage_override is not null
  and a.employee_percentage_override between 0 and 100
  and (a.employee_percentage_override + coalesce(t.assistant_percentage, 0)) <= 100
  and t.employee_percentage <> a.employee_percentage_override;
