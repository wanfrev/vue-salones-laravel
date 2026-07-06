-- =============================================================================
-- LIMPIEZA + COPIA COMPLETA: luma se vacía y se llena con datos de mimosa
-- mimosa_id: 12bfdad6-7756-4b69-bac5-5451d027c333
-- luma_id:   a2ee4807-c14e-44ba-99c9-f443acbee32c
-- =============================================================================
-- ADVERTENCIA: Este script BORRA todos los datos operativos de luma y los
-- reemplaza con los de mimosa. Los profiles de luma NO se borran (auth.users).
-- Ejecuta en el SQL Editor de Supabase.
-- =============================================================================

DO $$
DECLARE
  mimosa_id uuid := '12bfdad6-7756-4b69-bac5-5451d027c333';
  luma_id   uuid := 'a2ee4807-c14e-44ba-99c9-f443acbee32c';
  fallback_employee uuid;
  n         integer;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FASE 1: LIMPIANDO luma';
  RAISE NOTICE '========================================';

  -- Eliminar en orden inverso de dependencias FK
  DELETE FROM public.notifications            WHERE business_id = luma_id;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'notifications: %', n;

  DELETE FROM public.supplier_payments        WHERE business_id = luma_id;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'supplier_payments: %', n;

  DELETE FROM public.inventory_movements      WHERE business_id = luma_id;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'inventory_movements: %', n;

  DELETE FROM public.inventory_stock          WHERE business_id = luma_id;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'inventory_stock: %', n;

  DELETE FROM public.client_preferred_services WHERE branch_id IN (SELECT id FROM public.branches WHERE business_id = luma_id);
  DELETE FROM public.client_preferred_services WHERE client_id IN (SELECT id FROM public.clients WHERE business_id = luma_id);
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'client_preferred_services: %', n;

  DELETE FROM public.appointment_services     WHERE appointment_id IN (SELECT id FROM public.appointments WHERE business_id = luma_id);
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'appointment_services: %', n;

  DELETE FROM public.transactions             WHERE business_id = luma_id;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'transactions: %', n;

  DELETE FROM public.appointments             WHERE business_id = luma_id;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'appointments: %', n;

  DELETE FROM public.employee_absences        WHERE business_id = luma_id;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'employee_absences: %', n;

  DELETE FROM public.employee_payments        WHERE business_id = luma_id;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'employee_payments: %', n;

  DELETE FROM public.employee_services        WHERE employee_id IN (SELECT id FROM public.profiles WHERE business_id = luma_id);
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'employee_services: %', n;

  DELETE FROM public.employee_schedules       WHERE employee_id IN (SELECT id FROM public.profiles WHERE business_id = luma_id);
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'employee_schedules: %', n;

  DELETE FROM public.expenses                 WHERE business_id = luma_id;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'expenses: %', n;

  DELETE FROM public.supplier_payments        WHERE business_id = luma_id;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'supplier_payments: %', n;

  DELETE FROM public.suppliers                WHERE business_id = luma_id;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'suppliers: %', n;

  DELETE FROM public.clients                  WHERE business_id = luma_id;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'clients: %', n;

  DELETE FROM public.service_variants         WHERE business_id = luma_id;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'service_variants: %', n;

  DELETE FROM public.services                 WHERE business_id = luma_id;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'services: %', n;

  DELETE FROM public.inventory_locations      WHERE business_id = luma_id;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'inventory_locations: %', n;

  DELETE FROM public.product_variants         WHERE product_id IN (SELECT id FROM public.products WHERE business_id = luma_id);
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'product_variants: %', n;

  DELETE FROM public.products                 WHERE business_id = luma_id;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'products: %', n;

  DELETE FROM public.product_categories       WHERE business_id = luma_id;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'product_categories: %', n;

  DELETE FROM public.service_categories       WHERE business_id = luma_id;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'service_categories: %', n;

  -- Eliminar branches excepto el default (para no romper el trigger)
  DELETE FROM public.branches                 WHERE business_id = luma_id AND is_default = false;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'branches (no default): %', n;

  -- ================================================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FASE 2: COPIANDO mimosa → luma';
  RAISE NOTICE 'mimosa_id: %', mimosa_id;
  RAISE NOTICE 'luma_id:   %', luma_id;
  RAISE NOTICE '========================================';

  -- Obtener perfil fallback de luma para employee_id NOT NULL
  SELECT id INTO fallback_employee FROM public.profiles WHERE business_id = luma_id LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'luma no tiene ningún perfil/empleado. Crea al menos un empleado en luma antes de copiar.';
  END IF;
  RAISE NOTICE 'Perfil fallback luma: %', fallback_employee;

  ------------------------------------------------------------------
  -- TABLAS TEMPORALES DE MAPEO old_id → new_id
  ------------------------------------------------------------------
  CREATE TEMP TABLE IF NOT EXISTS map_branches            (old_id uuid PRIMARY KEY, new_id uuid);
  CREATE TEMP TABLE IF NOT EXISTS map_service_categories  (old_id uuid PRIMARY KEY, new_id uuid);
  CREATE TEMP TABLE IF NOT EXISTS map_product_categories  (old_id uuid PRIMARY KEY, new_id uuid);
  CREATE TEMP TABLE IF NOT EXISTS map_products            (old_id uuid PRIMARY KEY, new_id uuid);
  CREATE TEMP TABLE IF NOT EXISTS map_product_variants    (old_id uuid PRIMARY KEY, new_id uuid);
  CREATE TEMP TABLE IF NOT EXISTS map_inventory_locations (old_id uuid PRIMARY KEY, new_id uuid);
  CREATE TEMP TABLE IF NOT EXISTS map_services            (old_id uuid PRIMARY KEY, new_id uuid);
  CREATE TEMP TABLE IF NOT EXISTS map_service_variants    (old_id uuid PRIMARY KEY, new_id uuid);
  CREATE TEMP TABLE IF NOT EXISTS map_clients             (old_id uuid PRIMARY KEY, new_id uuid);
  CREATE TEMP TABLE IF NOT EXISTS map_suppliers           (old_id uuid PRIMARY KEY, new_id uuid);
  CREATE TEMP TABLE IF NOT EXISTS map_appointments        (old_id uuid PRIMARY KEY, new_id uuid);

  ------------------------------------------------------------------
  -- 1. branches
  ------------------------------------------------------------------
  CREATE TEMP TABLE _cp AS
  SELECT id AS old_id, gen_random_uuid() AS new_id,
         name, address, phone, is_default, active, ves_exchange_rate, created_at, updated_at
  FROM public.branches WHERE business_id = mimosa_id;

  INSERT INTO map_branches (old_id, new_id)
  SELECT old_id, new_id FROM _cp;

  INSERT INTO public.branches (id, business_id, name, address, phone, is_default, active, ves_exchange_rate, created_at, updated_at)
  SELECT new_id, luma_id, name, address, phone, false, active, ves_exchange_rate, created_at, updated_at
  FROM _cp ON CONFLICT (business_id, name) DO NOTHING;

  DELETE FROM map_branches WHERE old_id IN (SELECT c.old_id FROM _cp c LEFT JOIN public.branches d ON d.id = c.new_id WHERE d.id IS NULL);
  DROP TABLE _cp;
  SELECT count(*) INTO n FROM map_branches; RAISE NOTICE '1. branches: %', n;

  ------------------------------------------------------------------
  -- 2. service_categories (parents first, then children)
  ------------------------------------------------------------------
  CREATE TEMP TABLE _cp AS
  SELECT id AS old_id, gen_random_uuid() AS new_id, parent_id, name, description, active, metadata, created_at, updated_at
  FROM public.service_categories WHERE business_id = mimosa_id AND parent_id IS NULL;

  INSERT INTO map_service_categories (old_id, new_id)
  SELECT old_id, new_id FROM _cp;

  INSERT INTO public.service_categories (id, business_id, parent_id, name, description, active, metadata, created_at, updated_at)
  SELECT new_id, luma_id, NULL, name, description, active, metadata, created_at, updated_at
  FROM _cp ON CONFLICT (business_id, name) DO NOTHING;

  DELETE FROM map_service_categories WHERE old_id IN (SELECT c.old_id FROM _cp c LEFT JOIN public.service_categories d ON d.id = c.new_id WHERE d.id IS NULL);
  DROP TABLE _cp;
  SELECT count(*) INTO n FROM map_service_categories; RAISE NOTICE '2. service_categories (padres): %', n;

  -- Children
  CREATE TEMP TABLE _cp AS
  SELECT id AS old_id, gen_random_uuid() AS new_id, parent_id, name, description, active, metadata, created_at, updated_at
  FROM public.service_categories WHERE business_id = mimosa_id AND parent_id IS NOT NULL;

  INSERT INTO map_service_categories (old_id, new_id)
  SELECT old_id, new_id FROM _cp ON CONFLICT (old_id) DO NOTHING;

  INSERT INTO public.service_categories (id, business_id, parent_id, name, description, active, metadata, created_at, updated_at)
  SELECT c.new_id, luma_id, (SELECT m.new_id FROM map_service_categories m WHERE m.old_id = c.parent_id),
         c.name, c.description, c.active, c.metadata, c.created_at, c.updated_at
  FROM _cp c ON CONFLICT (business_id, name) DO NOTHING;

  DELETE FROM map_service_categories WHERE old_id IN (SELECT c.old_id FROM _cp c LEFT JOIN public.service_categories d ON d.id = c.new_id WHERE d.id IS NULL);
  DROP TABLE _cp;
  SELECT count(*) INTO n FROM map_service_categories; RAISE NOTICE '2. service_categories (hijos): %', n;

  ------------------------------------------------------------------
  -- 3. product_categories (parents first, then children)
  ------------------------------------------------------------------
  CREATE TEMP TABLE _cp AS
  SELECT id AS old_id, gen_random_uuid() AS new_id, parent_id, name, description, active, metadata, created_at, updated_at,
         (SELECT m.new_id FROM map_branches m WHERE m.old_id = branch_id) AS new_branch_id
  FROM public.product_categories WHERE business_id = mimosa_id AND parent_id IS NULL;

  INSERT INTO map_product_categories (old_id, new_id)
  SELECT old_id, new_id FROM _cp;

  INSERT INTO public.product_categories (id, business_id, parent_id, name, description, active, metadata, created_at, updated_at, branch_id)
  SELECT new_id, luma_id, NULL, name, description, active, metadata, created_at, updated_at, new_branch_id
  FROM _cp ON CONFLICT (business_id, name) DO NOTHING;

  DELETE FROM map_product_categories WHERE old_id IN (SELECT c.old_id FROM _cp c LEFT JOIN public.product_categories d ON d.id = c.new_id WHERE d.id IS NULL);
  DROP TABLE _cp;
  SELECT count(*) INTO n FROM map_product_categories; RAISE NOTICE '3. product_categories (padres): %', n;

  -- Children
  CREATE TEMP TABLE _cp AS
  SELECT id AS old_id, gen_random_uuid() AS new_id, parent_id, name, description, active, metadata, created_at, updated_at,
         (SELECT m.new_id FROM map_branches m WHERE m.old_id = branch_id) AS new_branch_id
  FROM public.product_categories WHERE business_id = mimosa_id AND parent_id IS NOT NULL;

  INSERT INTO map_product_categories (old_id, new_id)
  SELECT old_id, new_id FROM _cp ON CONFLICT (old_id) DO NOTHING;

  INSERT INTO public.product_categories (id, business_id, parent_id, name, description, active, metadata, created_at, updated_at, branch_id)
  SELECT c.new_id, luma_id, (SELECT m.new_id FROM map_product_categories m WHERE m.old_id = c.parent_id),
         c.name, c.description, c.active, c.metadata, c.created_at, c.updated_at, c.new_branch_id
  FROM _cp c ON CONFLICT (business_id, name) DO NOTHING;

  DELETE FROM map_product_categories WHERE old_id IN (SELECT c.old_id FROM _cp c LEFT JOIN public.product_categories d ON d.id = c.new_id WHERE d.id IS NULL);
  DROP TABLE _cp;
  SELECT count(*) INTO n FROM map_product_categories; RAISE NOTICE '3. product_categories (hijos): %', n;

  ------------------------------------------------------------------
  -- 4. services
  ------------------------------------------------------------------
  CREATE TEMP TABLE _cp AS
  SELECT id AS old_id, gen_random_uuid() AS new_id,
         name, description, duration_minutes, price, local_percentage, color, active,
         (SELECT m.new_id FROM map_service_categories m WHERE m.old_id = service_category_id) AS new_service_category_id,
         (SELECT m.new_id FROM map_branches m WHERE m.old_id = branch_id) AS new_branch_id,
         created_at, updated_at
  FROM public.services WHERE business_id = mimosa_id;

  INSERT INTO map_services (old_id, new_id)
  SELECT old_id, new_id FROM _cp;

  INSERT INTO public.services (id, business_id, name, description, duration_minutes, price, local_percentage, color, active, service_category_id, branch_id, created_at, updated_at)
  SELECT new_id, luma_id, name, description, duration_minutes, price, local_percentage, color, active, new_service_category_id, new_branch_id, created_at, updated_at
  FROM _cp;

  SELECT count(*) INTO n FROM map_services; RAISE NOTICE '4. services: %', n;
  DROP TABLE _cp;

  ------------------------------------------------------------------
  -- 5. service_variants
  ------------------------------------------------------------------
  CREATE TEMP TABLE _cp AS
  SELECT id AS old_id, gen_random_uuid() AS new_id,
         (SELECT m.new_id FROM map_services m WHERE m.old_id = service_id) AS new_service_id,
         name, description, duration_minutes, price, active, metadata, created_at, updated_at
  FROM public.service_variants WHERE business_id = mimosa_id;

  INSERT INTO map_service_variants (old_id, new_id)
  SELECT old_id, new_id FROM _cp;

  INSERT INTO public.service_variants (id, business_id, service_id, name, description, duration_minutes, price, active, metadata, created_at, updated_at)
  SELECT new_id, luma_id, new_service_id, name, description, duration_minutes, price, active, metadata, created_at, updated_at
  FROM _cp;

  SELECT count(*) INTO n FROM map_service_variants; RAISE NOTICE '5. service_variants: %', n;
  DROP TABLE _cp;

  ------------------------------------------------------------------
  -- 6. products
  ------------------------------------------------------------------
  CREATE TEMP TABLE _cp AS
  SELECT id AS old_id, gen_random_uuid() AS new_id,
         (SELECT m.new_id FROM map_product_categories m WHERE m.old_id = category_id) AS new_category_id,
         name, description, sku, barcode, unit, unit_cost, unit_price, reorder_point, active, is_sellable, metadata,
         (SELECT m.new_id FROM map_branches m WHERE m.old_id = branch_id) AS new_branch_id,
         created_at, updated_at
  FROM public.products WHERE business_id = mimosa_id;

  INSERT INTO map_products (old_id, new_id)
  SELECT old_id, new_id FROM _cp;

  INSERT INTO public.products (id, business_id, category_id, name, description, sku, barcode, unit, unit_cost, unit_price, reorder_point, active, is_sellable, metadata, branch_id, created_at, updated_at)
  SELECT new_id, luma_id, new_category_id, name, description, sku, barcode, unit, unit_cost, unit_price, reorder_point, active, is_sellable, metadata, new_branch_id, created_at, updated_at
  FROM _cp ON CONFLICT (business_id, name) DO NOTHING;

  DELETE FROM map_products WHERE old_id IN (SELECT c.old_id FROM _cp c LEFT JOIN public.products d ON d.id = c.new_id WHERE d.id IS NULL);
  SELECT count(*) INTO n FROM map_products; RAISE NOTICE '6. products: %', n;
  DROP TABLE _cp;

  ------------------------------------------------------------------
  -- 7. product_variants
  ------------------------------------------------------------------
  CREATE TEMP TABLE _cp AS
  SELECT id AS old_id, gen_random_uuid() AS new_id,
         (SELECT m.new_id FROM map_products m WHERE m.old_id = product_id) AS new_product_id,
         name, sku, unit_cost, unit_price, metadata, active,
         (SELECT m.new_id FROM map_branches m WHERE m.old_id = branch_id) AS new_branch_id,
         created_at, updated_at
  FROM public.product_variants WHERE product_id IN (SELECT old_id FROM map_products);

  INSERT INTO map_product_variants (old_id, new_id)
  SELECT old_id, new_id FROM _cp;

  INSERT INTO public.product_variants (id, product_id, name, sku, unit_cost, unit_price, metadata, active, branch_id, created_at, updated_at)
  SELECT new_id, new_product_id, name, sku, unit_cost, unit_price, metadata, active, new_branch_id, created_at, updated_at
  FROM _cp;

  SELECT count(*) INTO n FROM map_product_variants; RAISE NOTICE '7. product_variants: %', n;
  DROP TABLE _cp;

  ------------------------------------------------------------------
  -- 8. inventory_locations
  ------------------------------------------------------------------
  CREATE TEMP TABLE _cp AS
  SELECT id AS old_id, gen_random_uuid() AS new_id,
         name, is_default, active, metadata,
         (SELECT m.new_id FROM map_branches m WHERE m.old_id = branch_id) AS new_branch_id,
         created_at, updated_at
  FROM public.inventory_locations WHERE business_id = mimosa_id;

  INSERT INTO map_inventory_locations (old_id, new_id)
  SELECT old_id, new_id FROM _cp;

  INSERT INTO public.inventory_locations (id, business_id, name, is_default, active, metadata, branch_id, created_at, updated_at)
  SELECT new_id, luma_id, name, is_default, active, metadata, new_branch_id, created_at, updated_at
  FROM _cp ON CONFLICT (business_id, name) DO NOTHING;

  DELETE FROM map_inventory_locations WHERE old_id IN (SELECT c.old_id FROM _cp c LEFT JOIN public.inventory_locations d ON d.id = c.new_id WHERE d.id IS NULL);
  DROP TABLE _cp;
  SELECT count(*) INTO n FROM map_inventory_locations; RAISE NOTICE '8. inventory_locations: %', n;

  ------------------------------------------------------------------
  -- 9. clients
  ------------------------------------------------------------------
  CREATE TEMP TABLE _cp AS
  SELECT id AS old_id, gen_random_uuid() AS new_id,
         full_name, phone, email, notes, birthday, metadata,
         (SELECT m.new_id FROM map_branches m WHERE m.old_id = branch_id) AS new_branch_id,
         created_at, updated_at
  FROM public.clients WHERE business_id = mimosa_id;

  INSERT INTO map_clients (old_id, new_id)
  SELECT old_id, new_id FROM _cp;

  INSERT INTO public.clients (id, business_id, full_name, phone, email, notes, birthday, metadata, branch_id, created_at, updated_at)
  SELECT new_id, luma_id, full_name, phone, email, notes, birthday, metadata, new_branch_id, created_at, updated_at
  FROM _cp ON CONFLICT (business_id, phone) DO NOTHING;

  DELETE FROM map_clients WHERE old_id IN (SELECT c.old_id FROM _cp c LEFT JOIN public.clients d ON d.id = c.new_id WHERE d.id IS NULL);
  SELECT count(*) INTO n FROM map_clients; RAISE NOTICE '9. clients: %', n;
  DROP TABLE _cp;

  ------------------------------------------------------------------
  -- 10. suppliers
  ------------------------------------------------------------------
  CREATE TEMP TABLE _cp AS
  SELECT id AS old_id, gen_random_uuid() AS new_id,
         first_name, last_name, phone, company, total_debt, debt_currency, debt_original_amount, debt_exchange_rate, notes, active,
         (SELECT m.new_id FROM map_branches m WHERE m.old_id = branch_id) AS new_branch_id,
         created_at, updated_at
  FROM public.suppliers WHERE business_id = mimosa_id;

  INSERT INTO map_suppliers (old_id, new_id)
  SELECT old_id, new_id FROM _cp;

  INSERT INTO public.suppliers (id, business_id, first_name, last_name, phone, company, total_debt, debt_currency, debt_original_amount, debt_exchange_rate, notes, active, branch_id, created_at, updated_at)
  SELECT new_id, luma_id, first_name, last_name, phone, company, total_debt, debt_currency, debt_original_amount, debt_exchange_rate, notes, active, new_branch_id, created_at, updated_at
  FROM _cp;

  SELECT count(*) INTO n FROM map_suppliers; RAISE NOTICE '10. suppliers: %', n;
  DROP TABLE _cp;

  ------------------------------------------------------------------
  -- 11. appointments  (desactivar trigger de solapamiento temporalmente)
  ------------------------------------------------------------------
  ALTER TABLE public.appointments DISABLE TRIGGER check_employee_overlap_trigger;
  ALTER TABLE public.appointments DISABLE TRIGGER trg_new_appointment_notification;

  CREATE TEMP TABLE _cp AS
  SELECT id AS old_id, gen_random_uuid() AS new_id,
         (SELECT m.new_id FROM map_clients m WHERE m.old_id = client_id) AS new_client_id,
         (SELECT m.new_id FROM map_services m WHERE m.old_id = service_id) AS new_service_id,
         start_time, end_time, status, payment_status, service_notes, internal_notes, reminder_sent_at, source,
         group_id, price_override, assistant_percentage, employee_percentage_override, duration_override,
         (SELECT m.new_id FROM map_branches m WHERE m.old_id = branch_id) AS new_branch_id,
         created_at, updated_at
  FROM public.appointments WHERE business_id = mimosa_id;

  INSERT INTO map_appointments (old_id, new_id)
  SELECT old_id, new_id FROM _cp;

  INSERT INTO public.appointments (id, business_id, client_id, employee_id, assistant_employee_id, service_id,
    start_time, end_time, status, payment_status, service_notes, internal_notes, reminder_sent_at, source, created_by,
    group_id, price_override, assistant_percentage, employee_percentage_override, duration_override, branch_id, created_at, updated_at)
  SELECT new_id, luma_id, new_client_id, fallback_employee, NULL, new_service_id,
         start_time, end_time, status, payment_status, service_notes, internal_notes, reminder_sent_at, source, NULL,
         group_id, price_override, assistant_percentage, employee_percentage_override, duration_override, new_branch_id, created_at, updated_at
  FROM _cp;

  ALTER TABLE public.appointments ENABLE TRIGGER check_employee_overlap_trigger;
  ALTER TABLE public.appointments ENABLE TRIGGER trg_new_appointment_notification;

  SELECT count(*) INTO n FROM map_appointments; RAISE NOTICE '11. appointments: %', n;
  DROP TABLE _cp;

  ------------------------------------------------------------------
  -- 12. appointment_services
  ------------------------------------------------------------------
  WITH rows_to_copy AS (
    SELECT aps.id AS old_id,
           (SELECT m.new_id FROM map_appointments m WHERE m.old_id = aps.appointment_id) AS new_appointment_id,
           (SELECT m.new_id FROM map_services m WHERE m.old_id = aps.service_id) AS new_service_id,
           price_applied, assistant_percentage, created_at
    FROM public.appointment_services aps
    WHERE aps.appointment_id IN (SELECT old_id FROM map_appointments)
  )
  INSERT INTO public.appointment_services (id, appointment_id, service_id, employee_id, assistant_id, assistant_percentage, price_applied, created_at)
  SELECT gen_random_uuid(), new_appointment_id, new_service_id, fallback_employee, NULL, assistant_percentage, price_applied, created_at
  FROM rows_to_copy
  WHERE new_appointment_id IS NOT NULL;

  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '12. appointment_services: %', n;

  ------------------------------------------------------------------
  -- 13. transactions
  ------------------------------------------------------------------
  WITH rows_to_copy AS (
    SELECT t.*,
           (SELECT m.new_id FROM map_appointments m WHERE m.old_id = t.appointment_id) AS new_appointment_id,
           (SELECT m.new_id FROM map_branches m WHERE m.old_id = t.branch_id) AS new_branch_id
    FROM public.transactions t
    WHERE t.business_id = mimosa_id
      AND t.appointment_id IN (SELECT old_id FROM map_appointments)
  )
  INSERT INTO public.transactions (id, business_id, appointment_id, total_amount, local_amount, employee_amount,
    local_percentage, employee_percentage, method, paid_at, created_by, notes, exchange_rate_used,
    payments_breakdown, assistant_amount, assistant_percentage, branch_id, tip_amount, created_at)
  SELECT gen_random_uuid(), luma_id, new_appointment_id, total_amount, local_amount, employee_amount,
         local_percentage, employee_percentage, method, paid_at, NULL, notes, exchange_rate_used,
         payments_breakdown, assistant_amount, assistant_percentage, new_branch_id, tip_amount, created_at
  FROM rows_to_copy
  WHERE new_appointment_id IS NOT NULL;

  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '13. transactions: %', n;

  ------------------------------------------------------------------
  -- 14. expenses
  ------------------------------------------------------------------
  INSERT INTO public.expenses (id, business_id, name, category, amount, expense_date, notes, created_by,
    branch_id, currency, original_amount, exchange_rate_used, created_at, updated_at)
  SELECT gen_random_uuid(), luma_id, name, category, amount, expense_date, notes, NULL,
         (SELECT m.new_id FROM map_branches m WHERE m.old_id = branch_id), currency, original_amount, exchange_rate_used, created_at, updated_at
  FROM public.expenses WHERE business_id = mimosa_id;

  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '14. expenses: %', n;

  ------------------------------------------------------------------
  -- 15. employee_payments
  ------------------------------------------------------------------
  INSERT INTO public.employee_payments (id, business_id, employee_id, amount, payment_method, notes, payment_date, created_by,
    currency, original_amount, exchange_rate_used, type, concept, branch_id, created_at, updated_at)
  SELECT gen_random_uuid(), luma_id, fallback_employee, amount, payment_method, notes, payment_date, NULL,
         currency, original_amount, exchange_rate_used, type, concept,
         (SELECT m.new_id FROM map_branches m WHERE m.old_id = branch_id), created_at, updated_at
  FROM public.employee_payments WHERE business_id = mimosa_id;

  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '15. employee_payments: %', n;

  ------------------------------------------------------------------
  -- 16. employee_absences
  ------------------------------------------------------------------
  INSERT INTO public.employee_absences (id, business_id, employee_id, type, starts_at, ends_at, reason, created_by, created_at, updated_at)
  SELECT gen_random_uuid(), luma_id, fallback_employee, type, starts_at, ends_at, reason, NULL, created_at, updated_at
  FROM public.employee_absences WHERE business_id = mimosa_id;

  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '16. employee_absences: %', n;

  ------------------------------------------------------------------
  -- 17. supplier_payments
  ------------------------------------------------------------------
  INSERT INTO public.supplier_payments (id, business_id, supplier_id, amount, payment_method, payment_date, notes, created_by,
    branch_id, created_at, updated_at)
  SELECT gen_random_uuid(), luma_id,
         (SELECT m.new_id FROM map_suppliers m WHERE m.old_id = supplier_id),
         amount, payment_method, payment_date, notes, NULL,
         (SELECT m.new_id FROM map_branches m WHERE m.old_id = branch_id), created_at, updated_at
  FROM public.supplier_payments WHERE business_id = mimosa_id;

  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '17. supplier_payments: %', n;

  ------------------------------------------------------------------
  -- 18. inventory_stock
  ------------------------------------------------------------------
  INSERT INTO public.inventory_stock (id, business_id, location_id, product_id, variant_id, quantity, reserved_qty, branch_id, updated_at)
  SELECT gen_random_uuid(), luma_id,
         (SELECT m.new_id FROM map_inventory_locations m WHERE m.old_id = location_id),
         (SELECT m.new_id FROM map_products m WHERE m.old_id = product_id),
         (SELECT m.new_id FROM map_product_variants m WHERE m.old_id = variant_id),
         quantity, reserved_qty,
         (SELECT m.new_id FROM map_branches m WHERE m.old_id = branch_id),
         updated_at
  FROM public.inventory_stock WHERE business_id = mimosa_id;

  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '18. inventory_stock: %', n;

  ------------------------------------------------------------------
  -- 19. inventory_movements
  ------------------------------------------------------------------
  INSERT INTO public.inventory_movements (id, business_id, location_id, product_id, variant_id, movement_type, quantity,
    unit_cost, reference_type, reference_id, notes, created_by, branch_id, exchange_rate_used, created_at)
  SELECT gen_random_uuid(), luma_id,
         (SELECT m.new_id FROM map_inventory_locations m WHERE m.old_id = location_id),
         (SELECT m.new_id FROM map_products m WHERE m.old_id = product_id),
         (SELECT m.new_id FROM map_product_variants m WHERE m.old_id = variant_id),
         movement_type, quantity, unit_cost, reference_type, reference_id, notes, NULL,
         (SELECT m.new_id FROM map_branches m WHERE m.old_id = branch_id),
         exchange_rate_used, created_at
  FROM public.inventory_movements WHERE business_id = mimosa_id;

  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '19. inventory_movements: %', n;

  ------------------------------------------------------------------
  -- 20. notifications
  ------------------------------------------------------------------
  INSERT INTO public.notifications (id, business_id, profile_id, type, title, message, appointment_id,
    client_name, client_phone, service_name, appointment_time, metadata, is_read, read_at, created_at)
  SELECT gen_random_uuid(), luma_id, fallback_employee, type, title, message,
         (SELECT m.new_id FROM map_appointments m WHERE m.old_id = appointment_id),
         client_name, client_phone, service_name, appointment_time, metadata, is_read, read_at, created_at
  FROM public.notifications WHERE business_id = mimosa_id;

  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '20. notifications: %', n;

  ------------------------------------------------------------------
  -- 21. client_preferred_services
  ------------------------------------------------------------------
  INSERT INTO public.client_preferred_services (client_id, service_id, branch_id, created_at)
  SELECT (SELECT m.new_id FROM map_clients m WHERE m.old_id = cps.client_id),
         (SELECT m.new_id FROM map_services m WHERE m.old_id = cps.service_id),
         (SELECT m.new_id FROM map_branches m WHERE m.old_id = cps.branch_id),
         cps.created_at
  FROM public.client_preferred_services cps
  WHERE cps.client_id IN (SELECT old_id FROM map_clients);

  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '21. client_preferred_services: %', n;

  ------------------------------------------------------------------
  -- RESUMEN
  ------------------------------------------------------------------
  RAISE NOTICE '========================================';
  RAISE NOTICE 'COPIA COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '========================================';

  SELECT count(*) INTO n FROM map_branches;            RAISE NOTICE '  branches: %', n;
  SELECT count(*) INTO n FROM map_service_categories;  RAISE NOTICE '  service_categories: %', n;
  SELECT count(*) INTO n FROM map_product_categories;  RAISE NOTICE '  product_categories: %', n;
  SELECT count(*) INTO n FROM map_services;            RAISE NOTICE '  services: %', n;
  SELECT count(*) INTO n FROM map_service_variants;    RAISE NOTICE '  service_variants: %', n;
  SELECT count(*) INTO n FROM map_products;            RAISE NOTICE '  products: %', n;
  SELECT count(*) INTO n FROM map_product_variants;    RAISE NOTICE '  product_variants: %', n;
  SELECT count(*) INTO n FROM map_inventory_locations; RAISE NOTICE '  inventory_locations: %', n;
  SELECT count(*) INTO n FROM map_clients;             RAISE NOTICE '  clients: %', n;
  SELECT count(*) INTO n FROM map_suppliers;           RAISE NOTICE '  suppliers: %', n;
  SELECT count(*) INTO n FROM map_appointments;        RAISE NOTICE '  appointments: %', n;

END $$;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
SELECT 'services' AS tabla, count(*) AS filas FROM public.services WHERE business_id = 'a2ee4807-c14e-44ba-99c9-f443acbee32c'
UNION ALL
SELECT 'clients', count(*) FROM public.clients WHERE business_id = 'a2ee4807-c14e-44ba-99c9-f443acbee32c'
UNION ALL
SELECT 'appointments', count(*) FROM public.appointments WHERE business_id = 'a2ee4807-c14e-44ba-99c9-f443acbee32c'
UNION ALL
SELECT 'transactions', count(*) FROM public.transactions WHERE business_id = 'a2ee4807-c14e-44ba-99c9-f443acbee32c'
UNION ALL
SELECT 'products', count(*) FROM public.products WHERE business_id = 'a2ee4807-c14e-44ba-99c9-f443acbee32c'
UNION ALL
SELECT 'inventory_stock', count(*) FROM public.inventory_stock WHERE business_id = 'a2ee4807-c14e-44ba-99c9-f443acbee32c'
UNION ALL
SELECT 'expenses', count(*) FROM public.expenses WHERE business_id = 'a2ee4807-c14e-44ba-99c9-f443acbee32c'
UNION ALL
SELECT 'employee_payments', count(*) FROM public.employee_payments WHERE business_id = 'a2ee4807-c14e-44ba-99c9-f443acbee32c'
UNION ALL
SELECT 'suppliers', count(*) FROM public.suppliers WHERE business_id = 'a2ee4807-c14e-44ba-99c9-f443acbee32c'
UNION ALL
SELECT 'supplier_payments', count(*) FROM public.supplier_payments WHERE business_id = 'a2ee4807-c14e-44ba-99c9-f443acbee32c'
UNION ALL
SELECT 'notifications', count(*) FROM public.notifications WHERE business_id = 'a2ee4807-c14e-44ba-99c9-f443acbee32c'
UNION ALL
SELECT 'branches', count(*) FROM public.branches WHERE business_id = 'a2ee4807-c14e-44ba-99c9-f443acbee32c'
ORDER BY tabla;
