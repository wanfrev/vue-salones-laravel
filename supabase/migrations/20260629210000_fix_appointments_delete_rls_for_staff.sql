-- Allow employees to delete their own appointments
-- Previous DELETE policy only allowed admins, so employees saw
-- a success toast but the appointment was never deleted (silent RLS block).

drop policy if exists appointments_delete on public.appointments;

create policy appointments_delete on public.appointments
  for delete to authenticated
  using (
    public.is_admin_of(business_id)
    or (employee_id = auth.uid() and public.is_staff_of(business_id))
  );
