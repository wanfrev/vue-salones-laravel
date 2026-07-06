CREATE TABLE employee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'cash',
  notes TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE employee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employee_payments_select" ON employee_payments
  FOR SELECT TO AUTHENTICATED
  USING (public.is_admin_of(business_id));

CREATE POLICY "employee_payments_insert" ON employee_payments
  FOR INSERT TO AUTHENTICATED
  WITH CHECK (public.is_admin_of(business_id));

CREATE POLICY "employee_payments_update" ON employee_payments
  FOR UPDATE TO AUTHENTICATED
  USING (public.is_admin_of(business_id))
  WITH CHECK (public.is_admin_of(business_id));

CREATE POLICY "employee_payments_delete" ON employee_payments
  FOR DELETE TO AUTHENTICATED
  USING (public.is_admin_of(business_id));

CREATE INDEX idx_employee_payments_business ON employee_payments(business_id);
CREATE INDEX idx_employee_payments_employee ON employee_payments(employee_id);
CREATE INDEX idx_employee_payments_date ON employee_payments(payment_date);
