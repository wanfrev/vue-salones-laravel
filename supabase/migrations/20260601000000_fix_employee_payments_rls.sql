-- Fix RLS policies for employee_payments
-- The original policy lacked explicit WITH CHECK for INSERT

DROP POLICY IF EXISTS "admins manage employee_payments" ON employee_payments;

CREATE POLICY "employee_payments_select" ON employee_payments
  FOR SELECT TO authenticated
  USING (public.is_admin_of(business_id));

CREATE POLICY "employee_payments_insert" ON employee_payments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_of(business_id));

CREATE POLICY "employee_payments_update" ON employee_payments
  FOR UPDATE TO authenticated
  USING (public.is_admin_of(business_id))
  WITH CHECK (public.is_admin_of(business_id));

CREATE POLICY "employee_payments_delete" ON employee_payments
  FOR DELETE TO authenticated
  USING (public.is_admin_of(business_id));
