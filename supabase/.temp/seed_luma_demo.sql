-- Seed completo para Luma demo (5240b752-b21d-4ddf-b60b-670ac2d7e034)
-- 2 sucursales activas: Luma Balin (967e4b18-95b0-4e14-bb1f-cf25e7ae9ecd), Luma Ana Maria (3bd9d6d4-2ba8-447c-99d1-5fd54e09f51c)

DO $$
DECLARE
    v_biz_id uuid := '5240b752-b21d-4ddf-b60b-670ac2d7e034';
    v_admin_id uuid := 'ba8e906e-8d1e-44fe-b468-d9ebb73bc7d8';
    v_branch_balin uuid := '967e4b18-95b0-4e14-bb1f-cf25e7ae9ecd';
    v_branch_am uuid := '3bd9d6d4-2ba8-447c-99d1-5fd54e09f51c';
    v_now timestamptz := now();
    v_uid uuid;
    v_eid1 uuid; v_eid2 uuid; v_eid3 uuid; v_eid4 uuid; v_eid5 uuid;
    v_svc1 uuid; v_svc2 uuid; v_svc3 uuid; v_svc4 uuid;
    v_svc5 uuid; v_svc6 uuid; v_svc7 uuid; v_svc8 uuid; v_svc9 uuid; v_svc10 uuid;
    v_svc_ids uuid[];
    v_cid uuid;
    v_cat1 uuid; v_cat2 uuid; v_cat3 uuid; v_cat4 uuid;
    v_pid uuid;
    v_loc1 uuid; v_loc2 uuid;
    v_sup1 uuid; v_sup2 uuid;
    v_client_ids uuid[];
    v_emp_ids uuid[];
    v_i integer;
    v_emp uuid;
    v_svc uuid;
    v_client uuid;
    v_date timestamptz;
    v_end timestamptz;
    v_price numeric;
    v_status appointment_status;
    v_idx integer;
BEGIN

    RAISE NOTICE 'Seed Luma demo (2 sucursales)...';

    ----------------------------------------------------------------
    -- 1. EMPLEADOS (5) — distribuidos entre sucursales
    ----------------------------------------------------------------
    v_eid1 := gen_random_uuid(); v_eid2 := gen_random_uuid();
    v_eid3 := gen_random_uuid(); v_eid4 := gen_random_uuid();
    v_eid5 := gen_random_uuid();
    v_emp_ids := ARRAY[v_eid1, v_eid2, v_eid3, v_eid4, v_eid5];

    -- Empleado 1: Estilista senior (Balin)
    INSERT INTO users (id, name, email, password, created_at, updated_at)
    VALUES (v_eid1, 'Rafael Méndez', 'rafael@luma.app', '$2y$12$epGGdWEZYtxPF6YFjKEHqeT/8Crp1Hxic2tP.4P97R3JngeX.XNu2', v_now, v_now);
    INSERT INTO profiles (id, business_id, full_name, role, phone, email, job_title, pay_type, pay_percentage, base_salary, active, created_at, updated_at)
    VALUES (v_eid1, v_biz_id, 'Rafael Méndez', 'empleado', '+584241110001', 'rafael@luma.app', 'Estilista Senior', 'percentage', 55, 0, true, v_now, v_now);

    -- Empleado 2: Colorista (Balin)
    INSERT INTO users (id, name, email, password, created_at, updated_at)
    VALUES (v_eid2, 'Daniela Ríos', 'daniela@luma.app', '$2y$12$epGGdWEZYtxPF6YFjKEHqeT/8Crp1Hxic2tP.4P97R3JngeX.XNu2', v_now, v_now);
    INSERT INTO profiles (id, business_id, full_name, role, phone, email, job_title, pay_type, pay_percentage, base_salary, active, created_at, updated_at)
    VALUES (v_eid2, v_biz_id, 'Daniela Ríos', 'empleado', '+584241110002', 'daniela@luma.app', 'Colorista Profesional', 'percentage', 50, 0, true, v_now, v_now);

    -- Empleado 3: Barbero (Balin)
    INSERT INTO users (id, name, email, password, created_at, updated_at)
    VALUES (v_eid3, 'Luis Ortega', 'luis@luma.app', '$2y$12$epGGdWEZYtxPF6YFjKEHqeT/8Crp1Hxic2tP.4P97R3JngeX.XNu2', v_now, v_now);
    INSERT INTO profiles (id, business_id, full_name, role, phone, email, job_title, pay_type, pay_percentage, base_salary, active, created_at, updated_at)
    VALUES (v_eid3, v_biz_id, 'Luis Ortega', 'empleado', '+584241110003', 'luis@luma.app', 'Barbero', 'mixed', 40, 150, true, v_now, v_now);

    -- Empleado 4: Manicurista (Ana Maria)
    INSERT INTO users (id, name, email, password, created_at, updated_at)
    VALUES (v_eid4, 'Carmen Díaz', 'carmen@luma.app', '$2y$12$epGGdWEZYtxPF6YFjKEHqeT/8Crp1Hxic2tP.4P97R3JngeX.XNu2', v_now, v_now);
    INSERT INTO profiles (id, business_id, full_name, role, phone, email, job_title, pay_type, pay_percentage, base_salary, active, created_at, updated_at)
    VALUES (v_eid4, v_biz_id, 'Carmen Díaz', 'empleado', '+584241110004', 'carmen@luma.app', 'Manicurista', 'percentage', 50, 0, true, v_now, v_now);

    -- Empleado 5: Estilista (Ana Maria)
    INSERT INTO users (id, name, email, password, created_at, updated_at)
    VALUES (v_eid5, 'Fernando Ruiz', 'fernando@luma.app', '$2y$12$epGGdWEZYtxPF6YFjKEHqeT/8Crp1Hxic2tP.4P97R3JngeX.XNu2', v_now, v_now);
    INSERT INTO profiles (id, business_id, full_name, role, phone, email, job_title, pay_type, pay_percentage, base_salary, active, created_at, updated_at)
    VALUES (v_eid5, v_biz_id, 'Fernando Ruiz', 'empleado', '+584241110005', 'fernando@luma.app', 'Estilista', 'percentage', 50, 0, true, v_now, v_now);

    ----------------------------------------------------------------
    -- 2. HORARIOS (Mon-Sat, 9-18 variados)
    ----------------------------------------------------------------
    FOR v_i IN 1..5 LOOP
        v_emp := v_emp_ids[v_i];
        v_uid := gen_random_uuid();
        INSERT INTO employee_schedules (id, employee_id, branch_id, weekday, start_time, end_time, created_at)
        VALUES (v_uid, v_emp, CASE WHEN v_i <= 3 THEN v_branch_balin ELSE v_branch_am END, 1, '09:00', '18:00', v_now);
        v_uid := gen_random_uuid();
        INSERT INTO employee_schedules (id, employee_id, branch_id, weekday, start_time, end_time, created_at)
        VALUES (v_uid, v_emp, CASE WHEN v_i <= 3 THEN v_branch_balin ELSE v_branch_am END, 2, '09:00', '18:00', v_now);
        v_uid := gen_random_uuid();
        INSERT INTO employee_schedules (id, employee_id, branch_id, weekday, start_time, end_time, created_at)
        VALUES (v_uid, v_emp, CASE WHEN v_i <= 3 THEN v_branch_balin ELSE v_branch_am END, 3, '09:00', '18:00', v_now);
        v_uid := gen_random_uuid();
        INSERT INTO employee_schedules (id, employee_id, branch_id, weekday, start_time, end_time, created_at)
        VALUES (v_uid, v_emp, CASE WHEN v_i <= 3 THEN v_branch_balin ELSE v_branch_am END, 4, '09:00', '18:00', v_now);
        v_uid := gen_random_uuid();
        INSERT INTO employee_schedules (id, employee_id, branch_id, weekday, start_time, end_time, created_at)
        VALUES (v_uid, v_emp, CASE WHEN v_i <= 3 THEN v_branch_balin ELSE v_branch_am END, 5, '09:00', '18:00', v_now);
        v_uid := gen_random_uuid();
        INSERT INTO employee_schedules (id, employee_id, branch_id, weekday, start_time, end_time, created_at)
        VALUES (v_uid, v_emp, CASE WHEN v_i <= 3 THEN v_branch_balin ELSE v_branch_am END, 6, '09:00', '14:00', v_now);
    END LOOP;

    ----------------------------------------------------------------
    -- 3. SERVICIOS (10)
    ----------------------------------------------------------------
    v_svc1 := gen_random_uuid(); v_svc2 := gen_random_uuid(); v_svc3 := gen_random_uuid();
    v_svc4 := gen_random_uuid(); v_svc5 := gen_random_uuid(); v_svc6 := gen_random_uuid();
    v_svc7 := gen_random_uuid(); v_svc8 := gen_random_uuid(); v_svc9 := gen_random_uuid();
    v_svc10 := gen_random_uuid();
    v_svc_ids := ARRAY[v_svc1, v_svc2, v_svc3, v_svc4, v_svc5, v_svc6, v_svc7, v_svc8, v_svc9, v_svc10];

    INSERT INTO services (id, business_id, branch_id, name, description, duration_minutes, price, local_percentage, color, active, category, created_at, updated_at) VALUES
    (v_svc1, v_biz_id, v_branch_balin, 'Corte clásico', 'Corte de caballero con tijera y máquina', 30, 15, 50, '#567CB0', true, 'Corte', v_now, v_now),
    (v_svc2, v_biz_id, v_branch_balin, 'Corte + Barba', 'Combo corte y perfilado de barba', 45, 25, 50, '#8B5E3C', true, 'Corte', v_now, v_now),
    (v_svc3, v_biz_id, v_branch_balin, 'Color completo', 'Tinte completo con productos profesionales', 90, 60, 45, '#D4A5A5', true, 'Color', v_now, v_now),
    (v_svc4, v_biz_id, v_branch_balin, 'Mechas balayage', 'Técnica de mechas balayage personalizadas', 120, 85, 45, '#E8C547', true, 'Color', v_now, v_now),
    (v_svc5, v_biz_id, v_branch_balin, 'Barba premium', 'Perfilado de barba con toalla caliente y productos', 25, 12, 50, '#6B4226', true, 'Barba', v_now, v_now),
    (v_svc6, v_biz_id, v_branch_balin, 'Peinado evento', 'Peinado para ocasiones especiales', 40, 30, 50, '#9B59B6', true, 'Corte', v_now, v_now),
    (v_svc7, v_biz_id, v_branch_am, 'Manicure spa', 'Manicure completo con exfoliación y parafina', 45, 20, 50, '#E91E63', true, 'Uñas', v_now, v_now),
    (v_svc8, v_biz_id, v_branch_am, 'Pedicure premium', 'Pedicure con tratamiento de pies', 50, 25, 50, '#FF5722', true, 'Uñas', v_now, v_now),
    (v_svc9, v_biz_id, v_branch_am, 'Tratamiento capilar', 'Hidratación profunda con keratina', 60, 45, 50, '#00BCD4', true, 'Color', v_now, v_now),
    (v_svc10, v_biz_id, v_branch_am, 'Corte + Color', 'Combo corte y color completo', 100, 70, 45, '#795548', true, 'Corte', v_now, v_now);

    ----------------------------------------------------------------
    -- 3.1 Asignar servicios a empleados
    ----------------------------------------------------------------
    -- Rafael: corte, barba, peinado
    INSERT INTO employee_services (employee_id, service_id) VALUES (v_eid1, v_svc1), (v_eid1, v_svc2), (v_eid1, v_svc5), (v_eid1, v_svc6);
    -- Daniela: color, mechas, tratamiento
    INSERT INTO employee_services (employee_id, service_id) VALUES (v_eid2, v_svc3), (v_eid2, v_svc4), (v_eid2, v_svc9);
    -- Luis: corte, barba
    INSERT INTO employee_services (employee_id, service_id) VALUES (v_eid3, v_svc1), (v_eid3, v_svc2), (v_eid3, v_svc5);
    -- Carmen: manicure, pedicure
    INSERT INTO employee_services (employee_id, service_id) VALUES (v_eid4, v_svc7), (v_eid4, v_svc8);
    -- Fernando: corte, color, corte+color
    INSERT INTO employee_services (employee_id, service_id) VALUES (v_eid5, v_svc1), (v_eid5, v_svc3), (v_eid5, v_svc10);

    ----------------------------------------------------------------
    -- 4. CLIENTES (15) — mezclados entre sucursales
    ----------------------------------------------------------------
    v_client_ids := ARRAY[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];

    INSERT INTO clients (id, business_id, branch_id, full_name, phone, birthday, created_at, updated_at) VALUES
    (v_client_ids[1], v_biz_id, v_branch_balin, 'Andrea Castillo', '+58424120001', '1992-03-15', v_now, v_now),
    (v_client_ids[2], v_biz_id, v_branch_balin, 'Roberto Jiménez', '+58424120002', '1988-07-22', v_now, v_now),
    (v_client_ids[3], v_biz_id, v_branch_balin, 'Valeria Suárez', '+58424120003', '1995-11-08', v_now, v_now),
    (v_client_ids[4], v_biz_id, v_branch_balin, 'Miguel Ángel Peña', '+58424120004', '1990-01-30', v_now, v_now),
    (v_client_ids[5], v_biz_id, v_branch_balin, 'Sofía Rodríguez', '+58424120005', '1998-06-14', v_now, v_now),
    (v_client_ids[6], v_biz_id, v_branch_balin, 'Diego Hernández', '+58424120006', '1985-09-03', v_now, v_now),
    (v_client_ids[7], v_biz_id, v_branch_balin, 'Camila Torres', '+58424120007', '1993-12-25', v_now, v_now),
    (v_client_ids[8], v_biz_id, v_branch_am, 'Natalia Vargas', '+58424120008', '1991-04-18', v_now, v_now),
    (v_client_ids[9], v_biz_id, v_branch_am, 'Gustavo Rojas', '+58424120009', '1987-08-11', v_now, v_now),
    (v_client_ids[10], v_biz_id, v_branch_am, 'Paula Mendoza', '+58424120010', '1996-02-28', v_now, v_now),
    (v_client_ids[11], v_biz_id, v_branch_am, 'Andrés Fuentes', '+58424120011', '1989-05-07', v_now, v_now),
    (v_client_ids[12], v_biz_id, v_branch_am, 'Isabella Cruz', '+58424120012', '1994-10-19', v_now, v_now),
    (v_client_ids[13], v_biz_id, v_branch_am, 'Gabriel Silva', '+58424120013', '1986-01-14', v_now, v_now),
    (v_client_ids[14], v_biz_id, v_branch_balin, 'Emma Delgado', '+58424120014', '1997-07-04', v_now, v_now),
    (v_client_ids[15], v_biz_id, v_branch_am, 'Lucas Navarro', '+58424120015', '1990-09-30', v_now, v_now);

    ----------------------------------------------------------------
    -- 5. CITAS (20) — últimas 2 semanas, mezclando sucursales
    ----------------------------------------------------------------
    FOR v_i IN 0..19 LOOP
        v_uid := gen_random_uuid();

        -- Alternar entre sucursales y servicios
        IF v_i < 12 THEN
            -- Luma Balin (cortes, barba, color)
            v_svc := v_svc_ids[(v_i % 6) + 1];
            v_emp := CASE (v_i % 3)
                WHEN 0 THEN v_eid1 WHEN 1 THEN v_eid2 ELSE v_eid3 END;
            v_client := v_client_ids[(v_i % 8) + 1];
            v_date := v_now - (random() * 14) * interval '1 day';
            v_date := date_trunc('day', v_date) + (9 + (v_i % 8)) * interval '1 hour';
        ELSE
            -- Luma Ana Maria (uñas, tratamiento, corte+color)
            v_svc := v_svc_ids[6 + (v_i % 4) + 1];
            v_emp := CASE (v_i % 2) WHEN 0 THEN v_eid4 ELSE v_eid5 END;
            v_client := v_client_ids[8 + (v_i % 8)];
            v_date := v_now - (random() * 14) * interval '1 day';
            v_date := date_trunc('day', v_date) + (10 + (v_i % 7)) * interval '1 hour';
        END IF;

        v_price := (SELECT price FROM services WHERE id = v_svc);
        v_end := v_date + (SELECT duration_minutes FROM services WHERE id = v_svc) * interval '1 minute';

        v_status := CASE (v_i % 5)
            WHEN 0 THEN 'completed'
            WHEN 1 THEN 'confirmed'
            WHEN 2 THEN 'completed'
            WHEN 3 THEN 'pending'
            ELSE 'cancelled'
        END;

        INSERT INTO appointments (id, business_id, branch_id, client_id, employee_id, service_id,
            start_time, end_time, status, payment_status, source, created_at, updated_at)
        VALUES (v_uid, v_biz_id, CASE WHEN v_i < 12 THEN v_branch_balin ELSE v_branch_am END,
            v_client, v_emp, v_svc, v_date, v_end, v_status::appointment_status,
            CASE WHEN v_status = 'completed' THEN 'paid'::payment_status ELSE 'unpaid'::payment_status END,
            'internal'::appointment_source, v_date, v_date);

        -- Crear transacción para citas completadas
        IF v_status = 'completed' THEN
            v_uid := gen_random_uuid();
            INSERT INTO transactions (id, business_id, branch_id, appointment_id, total_amount,
                local_amount, employee_amount, local_percentage, employee_percentage,
                method, paid_at, created_by, created_at)
            VALUES (v_uid, v_biz_id,
                CASE WHEN v_i < 12 THEN v_branch_balin ELSE v_branch_am END,
                (SELECT id FROM appointments ORDER BY created_at DESC LIMIT 1),
                v_price, round(v_price * 0.5, 2), round(v_price * 0.5, 2),
                50, 50, (ARRAY['cash'::payment_method, 'card'::payment_method, 'transfer'::payment_method])[1 + (v_i % 3)],
                v_end, v_admin_id, v_end);
        END IF;
    END LOOP;

    ----------------------------------------------------------------
    -- 6. PRODUCTOS + CATEGORÍAS + STOCK
    ----------------------------------------------------------------
    v_cat1 := gen_random_uuid(); v_cat2 := gen_random_uuid();
    v_cat3 := gen_random_uuid(); v_cat4 := gen_random_uuid();

    INSERT INTO product_categories (id, business_id, name, active, created_at, updated_at) VALUES
    (v_cat1, v_biz_id, 'Shampoo', true, v_now, v_now),
    (v_cat2, v_biz_id, 'Acondicionador', true, v_now, v_now),
    (v_cat3, v_biz_id, 'Tintes', true, v_now, v_now),
    (v_cat4, v_biz_id, 'Herramientas', true, v_now, v_now);

    -- Ubicaciones de inventario (1 por sucursal)
    v_loc1 := gen_random_uuid(); v_loc2 := gen_random_uuid();
    INSERT INTO inventory_locations (id, business_id, branch_id, name, is_default, active, created_at, updated_at) VALUES
    (v_loc1, v_biz_id, v_branch_balin, 'Almacén Balin', true, true, v_now, v_now),
    (v_loc2, v_biz_id, v_branch_am, 'Almacén Ana Maria', false, true, v_now, v_now);

    -- 12 productos
    FOR v_i IN 1..12 LOOP
        v_pid := gen_random_uuid();
        INSERT INTO products (id, business_id, branch_id, category_id, name, sku, unit, unit_cost, unit_price, reorder_point, active, created_at, updated_at) VALUES
        (v_pid, v_biz_id, CASE WHEN v_i <= 8 THEN v_branch_balin ELSE v_branch_am END,
            CASE (v_i % 4) WHEN 1 THEN v_cat1 WHEN 2 THEN v_cat2 WHEN 3 THEN v_cat3 ELSE v_cat4 END,
            (ARRAY['Shampoo Prof 500ml','Shampoo Matizador 300ml','Acondicionador Prof 500ml','Crema Peinar 250ml','Tinte Negro #1','Tinte Rubio #7','Tinte Rojo #4','Secador Prof','Plancha Alisadora','Kit Brochas Prof','Aceite Capilar 100ml','Gel Fijador 200ml'])[v_i],
            'SKU-' || lpad(v_i::text, 3, '0'),
            'unit',
            (ARRAY[8,12,8,6,5,6,6,40,35,15,4,5])[v_i],
            (ARRAY[15,22,15,11,10,12,12,75,65,30,9,10])[v_i],
            5, true, v_now, v_now);

        -- Stock en ubicación correspondiente
        INSERT INTO inventory_stock (id, business_id, branch_id, location_id, product_id, quantity, reserved_qty, updated_at)
        VALUES (gen_random_uuid(), v_biz_id,
            CASE WHEN v_i <= 8 THEN v_branch_balin ELSE v_branch_am END,
            CASE WHEN v_i <= 8 THEN v_loc1 ELSE v_loc2 END,
            v_pid, 10 + floor(random() * 40), 0, v_now);
    END LOOP;

    ----------------------------------------------------------------
    -- 7. PROVEEDORES (3)
    ----------------------------------------------------------------
    v_sup1 := gen_random_uuid(); v_sup2 := gen_random_uuid();
    v_uid := gen_random_uuid();
    INSERT INTO suppliers (id, business_id, first_name, last_name, company, phone, total_debt, active, created_at, updated_at) VALUES
    (v_sup1, v_biz_id, 'Distribuidora', 'Capilar C.A.', 'Dist. Capilar', '+582121110000', 0, true, v_now, v_now),
    (v_sup2, v_biz_id, 'Importadora', 'Belleza Plus', 'Imp. Belleza Plus', '+582122220000', 0, true, v_now, v_now),
    (v_uid, v_biz_id, 'Proveedora', 'Estética Global', 'ProEstética Global', '+582123330000', 150, true, v_now, v_now);

    -- Pagos a proveedores (2)
    v_uid := gen_random_uuid();
    INSERT INTO supplier_payments (id, business_id, supplier_id, amount, payment_method, payment_date, notes, created_by, created_at, updated_at) VALUES
    (v_uid, v_biz_id, v_sup1, 200, 'transfer', current_date - 5, 'Compra mensual shampoos', v_admin_id, v_now, v_now);
    v_uid := gen_random_uuid();
    INSERT INTO supplier_payments (id, business_id, supplier_id, amount, payment_method, payment_date, notes, created_by, created_at, updated_at) VALUES
    (v_uid, v_biz_id, v_sup2, 350, 'cash', current_date - 3, 'Tintes y herramientas', v_admin_id, v_now, v_now);

    ----------------------------------------------------------------
    -- 8. GASTOS (8)
    ----------------------------------------------------------------
    FOR v_i IN 0..7 LOOP
        v_uid := gen_random_uuid();
        INSERT INTO expenses (id, business_id, branch_id, name, category, amount, expense_date, currency, created_by, created_at, updated_at) VALUES
        (v_uid, v_biz_id, CASE WHEN v_i < 5 THEN v_branch_balin ELSE v_branch_am END,
            (ARRAY['Alquiler local','Servicio internet','Publicidad Instagram','Mantenimiento AC','Compra insumos','Alquiler local','Agua y electricidad','Material desechable'])[v_i+1],
            (ARRAY['Fijos','Fijos','Marketing','Fijos','Insumos','Fijos','Fijos','Insumos'])[v_i+1],
            (ARRAY[400,45,60,80,180,350,55,40])[v_i+1],
            current_date - (v_i * 2)::integer,
            'USD', v_admin_id, v_now, v_now);
    END LOOP;

    ----------------------------------------------------------------
    -- 9. PAGOS A EMPLEADOS (4)
    ----------------------------------------------------------------
    INSERT INTO employee_payments (id, business_id, branch_id, employee_id, amount, currency, payment_method, type, concept, payment_date, created_by, created_at, updated_at) VALUES
    (gen_random_uuid(), v_biz_id, v_branch_balin, v_eid1, 200, 'USD', 'cash', 'payment', 'Comisión quincenal', current_date - 7, v_admin_id, v_now, v_now),
    (gen_random_uuid(), v_biz_id, v_branch_balin, v_eid2, 180, 'USD', 'transfer', 'payment', 'Comisión quincenal', current_date - 7, v_admin_id, v_now, v_now),
    (gen_random_uuid(), v_biz_id, v_branch_am, v_eid4, 150, 'USD', 'cash', 'payment', 'Comisión quincenal', current_date - 5, v_admin_id, v_now, v_now),
    (gen_random_uuid(), v_biz_id, v_branch_am, v_eid5, 160, 'USD', 'cash', 'payment', 'Comisión quincenal', current_date - 5, v_admin_id, v_now, v_now);

    ----------------------------------------------------------------
    -- 10. MOVIMIENTOS DE INVENTARIO (6)
    ----------------------------------------------------------------
    FOR v_i IN 0..5 LOOP
        v_pid := (SELECT id FROM products WHERE business_id = v_biz_id ORDER BY random() LIMIT 1);
        INSERT INTO inventory_movements (id, business_id, branch_id, location_id, product_id, movement_type, quantity, unit_cost, notes, created_by, created_at)
        VALUES (gen_random_uuid(), v_biz_id,
            CASE WHEN v_i < 4 THEN v_branch_balin ELSE v_branch_am END,
            CASE WHEN v_i < 4 THEN v_loc1 ELSE v_loc2 END,
            v_pid, CASE WHEN v_i % 2 = 0 THEN 'purchase'::inventory_movement_type ELSE 'adjustment'::inventory_movement_type END,
            CASE WHEN v_i % 2 = 0 THEN 10 ELSE -2 END, 5,
            CASE WHEN v_i % 2 = 0 THEN 'Compra a proveedor' ELSE 'Ajuste por conteo' END,
            v_admin_id, v_now - (v_i * 3) * interval '1 day');
    END LOOP;

    RAISE NOTICE '✅ Seed Luma demo completado: 5 empleados, 10 servicios, 15 clientes, 20 citas, 12 productos, 3 proveedores, 8 gastos';
END $$;
