-- Allow employees to view their own employee_payments records
-- Previous SELECT policy only allowed admins, so employees couldn't see
-- their payroll payments or consumptions in the receipt view.
-- The receipt silently showed zero payments/consumptions.

drop policy if exists "employee_payments_select" on public.employee_payments;

create policy "employee_payments_select"
  on public.employee_payments
  for select
  to authenticated
  using (
    public.is_admin_of(business_id)
    or (public.is_staff_of(business_id) and employee_id = auth.uid())
  );
