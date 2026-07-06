-- Migración #66: Cascada de payment_status por group_id
-- Cuando se paga una cita de un grupo, se actualiza el payment_status
-- de TODAS las citas del mismo grupo.

create or replace function public.record_payment(
  p_appointment_id       uuid,
  p_amount               numeric,
  p_method               payment_method default 'cash',
  p_notes                text default null,
  p_exchange_rate        numeric default null,
  p_payments_breakdown   jsonb default '[]'::jsonb,
  p_tip_amount           numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_appt               public.appointments;
  v_service            public.services;
  v_employee_profile   public.profiles;
  v_effective_price    numeric(12, 2);
  v_local_pct          numeric(5, 2);
  v_employee_pct       numeric(5, 2);
  v_assistant_pct      numeric(5, 2);
  v_local_amount       numeric(12, 2);
  v_employee_amount    numeric(12, 2);
  v_assistant_amount   numeric(12, 2);
  v_tip_amount         numeric(12, 2);
  v_tx_id              uuid;
  v_paid_so_far        numeric(12, 2);
  v_group_paid         numeric(12, 2);
  v_group_target       numeric(12, 2);
  v_exchange_rate      numeric(12, 4);
  v_new_status          payment_status;
  v_sibling             record;
  v_sibling_paid        numeric(12, 2);
  v_sibling_price       numeric(12, 2);
begin
  select * into v_appt from public.appointments where id = p_appointment_id;
  if v_appt.id is null then
    raise exception 'Appointment not found';
  end if;

  if not public.is_admin_of(v_appt.business_id) then
    raise exception 'Not authorized';
  end if;

  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  v_tip_amount := coalesce(p_tip_amount, 0);

  select * into v_service from public.services where id = v_appt.service_id;
  select * into v_employee_profile from public.profiles where id = v_appt.employee_id;

  v_effective_price := coalesce(v_appt.price_override, v_service.price);

  v_assistant_pct := coalesce(v_appt.assistant_percentage, 0);
  v_employee_pct := coalesce(
    v_appt.employee_percentage_override,
    v_employee_profile.pay_percentage,
    100 - v_service.local_percentage
  );
  v_local_pct := 100 - v_employee_pct - v_assistant_pct;

  -- Split: tip goes 100% to employee; commission on service amount only
  v_assistant_amount := round(p_amount * v_assistant_pct / 100, 2);
  v_employee_amount  := round(p_amount * v_employee_pct / 100, 2);
  v_local_amount     := round(p_amount - v_employee_amount - v_assistant_amount, 2);

  v_exchange_rate := coalesce(
    p_exchange_rate,
    (select b.ves_exchange_rate from public.branches b where b.id = v_appt.branch_id),
    (select bz.ves_exchange_rate from public.businesses bz where bz.id = v_appt.business_id),
    1
  );

  insert into public.transactions (
    business_id, branch_id, appointment_id,
    total_amount, local_amount, employee_amount, assistant_amount,
    local_percentage, employee_percentage, assistant_percentage,
    tip_amount,
    method, exchange_rate_used, payments_breakdown,
    created_by, notes
  )
  values (
    v_appt.business_id, v_appt.branch_id, p_appointment_id,
    p_amount, v_local_amount, v_employee_amount, v_assistant_amount,
    v_local_pct, v_employee_pct, v_assistant_pct,
    v_tip_amount,
    p_method, v_exchange_rate, p_payments_breakdown,
    auth.uid(), p_notes
  )
  returning id into v_tx_id;

  -- Update THIS appointment's payment_status
  select coalesce(sum(total_amount), 0) into v_paid_so_far
  from public.transactions
  where appointment_id = p_appointment_id;

  v_new_status := case
    when v_paid_so_far >= v_effective_price then 'paid'::payment_status
    when v_paid_so_far > 0                   then 'partial'::payment_status
    else                                           'unpaid'::payment_status
  end;

  -- Cascade payment_status to all siblings in the same group
  if v_appt.group_id is not null then
    for v_sibling in
      select * from public.appointments
      where group_id = v_appt.group_id
        and id != p_appointment_id
    loop
      -- Calculate total paid for this sibling
      select coalesce(sum(total_amount), 0) into v_sibling_paid
      from public.transactions
      where appointment_id = v_sibling.id;

      -- Calculate effective price for this sibling
      v_sibling_price := coalesce(
        v_sibling.price_override,
        (select price from public.services where id = v_sibling.service_id)
      );

      -- Set sibling's payment_status
      update public.appointments
      set payment_status = case
        when v_sibling_paid >= v_sibling_price then 'paid'::payment_status
        when v_sibling_paid > 0                 then 'partial'::payment_status
        else                                         'unpaid'::payment_status
      end
      where id = v_sibling.id;
    end loop;
  end if;

  -- Final update for the main appointment
  update public.appointments
  set payment_status = v_new_status
  where id = p_appointment_id;

  return v_tx_id;
end;
$$;

grant execute on function public.record_payment(
  uuid, numeric, payment_method, text, numeric, jsonb, numeric
) to authenticated;
