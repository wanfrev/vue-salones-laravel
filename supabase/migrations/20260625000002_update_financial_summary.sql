-- =============================================================================
-- Update financial_summary to accept p_branch_id for multi-branch filtering
-- =============================================================================
create or replace function public.financial_summary(
  p_business_id  uuid,
  p_period_start date,
  p_period_end   date,
  p_period       text default 'day',
  p_employee_id  uuid default null,
  p_branch_id    uuid default null
)
returns table (
  bucket            date,
  appointments      bigint,
  total_amount      numeric,
  local_amount      numeric,
  employee_amount   numeric
)
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_trunc text;
  v_tz    text;
begin
  if not public.is_staff_of(p_business_id) then
    raise exception 'Not authorized';
  end if;

  if p_period not in ('day', 'week', 'month') then
    raise exception 'p_period must be day|week|month';
  end if;

  v_trunc := p_period;

  select b.timezone into v_tz
  from public.businesses b
  where b.id = p_business_id;

  return query
  select
    date_trunc(v_trunc, (t.paid_at at time zone coalesce(v_tz, 'UTC')))::date as bucket,
    count(distinct t.appointment_id)::bigint                                  as appointments,
    coalesce(sum(t.total_amount), 0)                                          as total_amount,
    coalesce(sum(t.local_amount), 0)                                          as local_amount,
    coalesce(sum(t.employee_amount), 0)                                       as employee_amount
  from public.transactions t
  join public.appointments a on a.id = t.appointment_id
  where t.business_id = p_business_id
    and t.paid_at >= (p_period_start::timestamp at time zone coalesce(v_tz, 'UTC'))
    and t.paid_at <  ((p_period_end + 1)::timestamp at time zone coalesce(v_tz, 'UTC'))
    and (p_employee_id is null or a.employee_id = p_employee_id)
    and (p_branch_id is null or t.branch_id = p_branch_id)
  group by 1
  order by 1;
end;
$$;

grant execute on function public.financial_summary(uuid, date, date, text, uuid, uuid) to authenticated;
