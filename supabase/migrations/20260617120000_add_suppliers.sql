-- =============================================================================
-- Agrega tablas suppliers y supplier_payments para gestión de proveedores
-- =============================================================================

-- 1. Tabla de proveedores
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  total_debt NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_debt >= 0),
  debt_currency TEXT NOT NULL DEFAULT 'USD' CHECK (debt_currency IN ('USD', 'VES')),
  debt_original_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (debt_original_amount >= 0),
  debt_exchange_rate NUMERIC(12,4) NOT NULL DEFAULT 1 CHECK (debt_exchange_rate > 0),
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- 2. Tabla de abonos a proveedores
CREATE TABLE supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS para suppliers
CREATE POLICY "suppliers_select" ON suppliers
  FOR SELECT TO AUTHENTICATED
  USING (public.is_admin_of(business_id));

CREATE POLICY "suppliers_insert" ON suppliers
  FOR INSERT TO AUTHENTICATED
  WITH CHECK (public.is_admin_of(business_id));

CREATE POLICY "suppliers_update" ON suppliers
  FOR UPDATE TO AUTHENTICATED
  USING (public.is_admin_of(business_id))
  WITH CHECK (public.is_admin_of(business_id));

CREATE POLICY "suppliers_delete" ON suppliers
  FOR DELETE TO AUTHENTICATED
  USING (public.is_admin_of(business_id));

-- 4. Políticas RLS para supplier_payments
CREATE POLICY "supplier_payments_select" ON supplier_payments
  FOR SELECT TO AUTHENTICATED
  USING (public.is_admin_of(business_id));

CREATE POLICY "supplier_payments_insert" ON supplier_payments
  FOR INSERT TO AUTHENTICATED
  WITH CHECK (public.is_admin_of(business_id));

CREATE POLICY "supplier_payments_update" ON supplier_payments
  FOR UPDATE TO AUTHENTICATED
  USING (public.is_admin_of(business_id))
  WITH CHECK (public.is_admin_of(business_id));

CREATE POLICY "supplier_payments_delete" ON supplier_payments
  FOR DELETE TO AUTHENTICATED
  USING (public.is_admin_of(business_id));

-- 5. Índices
CREATE INDEX idx_suppliers_business ON suppliers(business_id);
CREATE INDEX idx_suppliers_active ON suppliers(business_id, active);

CREATE INDEX idx_supplier_payments_business ON supplier_payments(business_id);
CREATE INDEX idx_supplier_payments_supplier ON supplier_payments(supplier_id);
CREATE INDEX idx_supplier_payments_date ON supplier_payments(payment_date);
