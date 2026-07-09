<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DemoBusinessSeeder extends Seeder
{
    public function run(): void
    {
        $uuid = fn() => Str::uuid()->toString();
        $now = now();

        $bizId = '10000000-0000-0000-0000-000000000001';
        $adminId = '10000000-0000-0000-0000-000000000002';
        $branchId = '10000000-0000-0000-0000-000000000003';

        if (DB::table('businesses')->where('id', $bizId)->exists()) {
            $this->command->info('Negocio demo ya existe, saltando...');
            return;
        }

        // ── Business ──
        DB::table('businesses')->insert([
            'id' => $bizId, 'name' => 'Luma Demo Salon', 'slug' => 'luma-demo',
            'phone' => '+584141234567', 'address' => 'Av. Principal, Centro Comercial, Piso 2',
            'timezone' => 'America/Santo_Domingo', 'currency' => 'USD',
            'ves_exchange_rate' => 36.5, 'niche_type' => 'salon',
            'theme_config' => json_encode(['primary' => '#2F4156', 'secondary' => '#567CB0']),
            'terminology' => json_encode(['client' => 'Cliente', 'employee' => 'Empleado', 'service' => 'Servicio']),
            'job_titles' => json_encode(['Estilista', 'Barbero', 'Colorista', 'Manicurista']),
            'service_categories' => json_encode([['id' => 'cat1', 'name' => 'Corte'], ['id' => 'cat2', 'name' => 'Color'], ['id' => 'cat3', 'name' => 'Barba'], ['id' => 'cat4', 'name' => 'Uñas']]),
            'features' => json_encode(['pos' => true, 'inventario' => true, 'productos' => true, 'proveedores' => true, 'multi_branch' => false, 'gift_cards' => true, 'employees_create_clients' => true]),
            'active' => true, 'created_at' => $now, 'updated_at' => $now,
        ]);

        // ── Admin user ──
        DB::table('users')->insert([
            'id' => $adminId, 'name' => 'Admin Demo', 'email' => 'admin@luma.app',
            'password' => bcrypt('password'), 'created_at' => $now, 'updated_at' => $now,
        ]);
        DB::table('profiles')->insert([
            'id' => $adminId, 'business_id' => $bizId, 'full_name' => 'Admin Demo',
            'role' => 'admin', 'email' => 'admin@luma.app', 'active' => true, 'created_at' => $now, 'updated_at' => $now,
        ]);

        // ── Branch ──
        DB::table('branches')->insert([
            'id' => $branchId, 'business_id' => $bizId, 'name' => 'Principal',
            'address' => 'Av. Principal, CC Luma, Piso 2', 'is_default' => true, 'active' => true,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        // ── Employees (5) ──
        $employees = [
            ['name' => 'Carlos Rodríguez', 'email' => 'carlos@luma.app', 'pay_type' => 'percentage', 'pay_percentage' => 50, 'job_title' => 'Estilista'],
            ['name' => 'María González', 'email' => 'maria@luma.app', 'pay_type' => 'percentage', 'pay_percentage' => 45, 'job_title' => 'Colorista'],
            ['name' => 'José Martínez', 'email' => 'jose@luma.app', 'pay_type' => 'mixed', 'pay_percentage' => 30, 'base_salary' => 200, 'job_title' => 'Barbero'],
            ['name' => 'Ana López', 'email' => 'ana@luma.app', 'pay_type' => 'salary', 'base_salary' => 400, 'pay_percentage' => 0, 'job_title' => 'Manicurista'],
            ['name' => 'Pedro Sánchez', 'email' => 'pedro@luma.app', 'pay_type' => 'percentage', 'pay_percentage' => 50, 'job_title' => 'Estilista'],
        ];

        $employeeIds = [];
        foreach ($employees as $i => $emp) {
            $eid = $uuid();
            $employeeIds[] = $eid;
            DB::table('users')->insert([
                'id' => $eid, 'name' => $emp['name'], 'email' => $emp['email'],
                'password' => bcrypt('password'), 'created_at' => $now, 'updated_at' => $now,
            ]);
            DB::table('profiles')->insert([
                'id' => $eid, 'business_id' => $bizId, 'full_name' => $emp['name'],
                'role' => 'empleado', 'email' => $emp['email'], 'phone' => '+58414000000' . $i,
                'job_title' => $emp['job_title'], 'pay_type' => $emp['pay_type'],
                'pay_percentage' => $emp['pay_percentage'], 'base_salary' => $emp['base_salary'] ?? 0,
                'active' => true, 'created_at' => $now, 'updated_at' => $now,
            ]);
            // Schedule: Mon-Fri 9-18
            foreach ([1, 2, 3, 4, 5] as $d) {
                DB::table('employee_schedules')->insert([
                    'id' => $uuid(), 'employee_id' => $eid, 'branch_id' => $branchId,
                    'weekday' => $d, 'start_time' => '09:00', 'end_time' => '18:00', 'created_at' => $now,
                ]);
            }
        }
        $this->command->info('5 empleados creados');

        // ── Clients (20) ──
        $clientNames = ['Laura Fernández', 'Miguel Torres', 'Sofía Ramírez', 'Diego Vargas', 'Valentina Herrera',
            'Andrés Castillo', 'Camila Rojas', 'Sebastián Cruz', 'Isabella Morales', 'Daniel Ortega',
            'Natalia Mendoza', 'Gabriel Silva', 'Lucía Peña', 'Mateo Guerrero', 'Emma Delgado',
            'Alejandro Paredes', 'Victoria Navarro', 'Nicolás Campos', 'Renata Fuentes', 'Lucas Ríos'];
        $clientIds = [];
        foreach ($clientNames as $i => $name) {
            $cid = $uuid(); $clientIds[] = $cid;
            DB::table('clients')->insert([
                'id' => $cid, 'business_id' => $bizId, 'branch_id' => $branchId,
                'full_name' => $name, 'phone' => '+58424111' . str_pad($i, 4, '0', STR_PAD_LEFT),
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }
        $this->command->info('20 clientes creados');

        // ── Services (10) ──
        $services = [
            ['name' => 'Corte clásico', 'category' => 'Corte', 'price' => 15, 'duration' => 30],
            ['name' => 'Corte + Barba', 'category' => 'Corte', 'price' => 25, 'duration' => 45],
            ['name' => 'Color completo', 'category' => 'Color', 'price' => 60, 'duration' => 90],
            ['name' => 'Mechas', 'category' => 'Color', 'price' => 80, 'duration' => 120],
            ['name' => 'Barba', 'category' => 'Barba', 'price' => 10, 'duration' => 20],
            ['name' => 'Corte + Color', 'category' => 'Corte', 'price' => 70, 'duration' => 100],
            ['name' => 'Manicure', 'category' => 'Uñas', 'price' => 12, 'duration' => 30],
            ['name' => 'Pedicure', 'category' => 'Uñas', 'price' => 18, 'duration' => 45],
            ['name' => 'Peinado', 'category' => 'Corte', 'price' => 25, 'duration' => 30],
            ['name' => 'Tratamiento capilar', 'category' => 'Color', 'price' => 45, 'duration' => 60],
        ];
        $serviceIds = [];
        foreach ($services as $svc) {
            $sid = $uuid(); $serviceIds[] = $sid;
            DB::table('services')->insert([
                'id' => $sid, 'business_id' => $bizId, 'branch_id' => $branchId,
                'name' => $svc['name'], 'category' => $svc['category'],
                'price' => $svc['price'], 'duration_minutes' => $svc['duration'],
                'local_percentage' => 50, 'active' => true, 'color' => '#567CB0',
                'created_at' => $now, 'updated_at' => $now,
            ]);
            // Assign to employees
            DB::table('employee_services')->insert([
                'employee_id' => $employeeIds[array_rand($employeeIds)],
                'service_id' => $sid,
            ]);
        }
        $this->command->info('10 servicios creados');

        // ── Products (15) + categories (5) ──
        $categories = ['Shampoo', 'Acondicionador', 'Tintes', 'Herramientas', 'Cuidado'];
        $catIds = [];
        foreach ($categories as $cat) {
            $cid = $uuid(); $catIds[] = $cid;
            DB::table('product_categories')->insert([
                'id' => $cid, 'business_id' => $bizId, 'name' => $cat, 'active' => true, 'created_at' => $now, 'updated_at' => $now,
            ]);
        }

        $products = [
            ['name' => 'Shampoo profesional 500ml', 'cat' => 0, 'cost' => 8, 'price' => 15],
            ['name' => 'Acondicionador profesional 500ml', 'cat' => 1, 'cost' => 8, 'price' => 15],
            ['name' => 'Tinte color negro #1', 'cat' => 2, 'cost' => 5, 'price' => 10],
            ['name' => 'Tinte color rubio #7', 'cat' => 2, 'cost' => 6, 'price' => 12],
            ['name' => 'Tinte color rojo #4', 'cat' => 2, 'cost' => 6, 'price' => 12],
            ['name' => 'Secador profesional', 'cat' => 3, 'cost' => 40, 'price' => 75],
            ['name' => 'Plancha alisadora', 'cat' => 3, 'cost' => 35, 'price' => 65],
            ['name' => 'Tijeras profesionales', 'cat' => 3, 'cost' => 25, 'price' => 50],
            ['name' => 'Crema para peinar 250ml', 'cat' => 4, 'cost' => 6, 'price' => 11],
            ['name' => 'Aceite capilar 100ml', 'cat' => 4, 'cost' => 4, 'price' => 9],
            ['name' => 'Gel fijador 200ml', 'cat' => 4, 'cost' => 5, 'price' => 10],
            ['name' => 'Cera moldeadora 150ml', 'cat' => 4, 'cost' => 5, 'price' => 10],
            ['name' => 'Shampoo matizador 300ml', 'cat' => 0, 'cost' => 12, 'price' => 22],
            ['name' => 'Kit de brochas', 'cat' => 3, 'cost' => 15, 'price' => 30],
            ['name' => 'Mascarilla capilar 250ml', 'cat' => 4, 'cost' => 10, 'price' => 18],
        ];
        $productIds = [];
        $locId = $uuid();
        DB::table('inventory_locations')->insert([
            'id' => $locId, 'business_id' => $bizId, 'branch_id' => $branchId,
            'name' => 'Almacén principal', 'is_default' => true, 'active' => true,
            'created_at' => $now, 'updated_at' => $now,
        ]);
        foreach ($products as $p) {
            $pid = $uuid(); $productIds[] = $pid;
            DB::table('products')->insert([
                'id' => $pid, 'business_id' => $bizId, 'branch_id' => $branchId,
                'category_id' => $catIds[$p['cat']], 'name' => $p['name'],
                'sku' => 'SKU-' . str_pad(count($productIds), 4, '0', STR_PAD_LEFT),
                'unit' => 'unit', 'unit_cost' => $p['cost'], 'unit_price' => $p['price'],
                'reorder_point' => 5, 'active' => true, 'is_sellable' => true,
                'created_at' => $now, 'updated_at' => $now,
            ]);
            // Stock
            DB::table('inventory_stock')->insert([
                'id' => $uuid(), 'business_id' => $bizId, 'branch_id' => $branchId,
                'location_id' => $locId, 'product_id' => $pid,
                'quantity' => rand(10, 50), 'reserved_qty' => 0, 'updated_at' => $now,
            ]);
        }
        $this->command->info('15 productos con stock creados');

        // ── Suppliers (2) ──
        $sup1 = $uuid(); $sup2 = $uuid();
        DB::table('suppliers')->insert([
            ['id' => $sup1, 'business_id' => $bizId, 'first_name' => 'Distribuidora', 'last_name' => 'Capilar C.A.', 'company' => 'Dist. Capilar', 'phone' => '+582121112222', 'active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['id' => $sup2, 'business_id' => $bizId, 'first_name' => 'Importadora', 'last_name' => 'Belleza', 'company' => 'Imp. Belleza', 'phone' => '+582123334444', 'active' => true, 'created_at' => $now, 'updated_at' => $now],
        ]);
        $this->command->info('2 proveedores creados');

        // ── Gift Cards (3) ──
        for ($i = 0; $i < 3; $i++) {
            DB::table('gift_cards')->insert([
                'id' => $uuid(), 'business_id' => $bizId, 'branch_id' => $branchId,
                'recipient_name' => ['Cumpleaños Ana', 'Regalo Navidad', 'Promoción verano'][$i],
                'amount' => [30, 50, 25][$i], 'status' => $i === 2 ? 'redeemed' : 'active',
                'created_by' => $adminId, 'redeemed_at' => $i === 2 ? $now : null,
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }
        $this->command->info('3 gift cards creadas');

        // ── Appointments (20) + Transactions ──
        $statuses = ['confirmed', 'completed', 'cancelled', 'pending', 'completed'];
        $txCount = 0;
        for ($i = 0; $i < 20; $i++) {
            $apptId = $uuid();
            $svc = $serviceIds[array_rand($serviceIds)];
            $emp = $employeeIds[array_rand($employeeIds)];
            $client = $clientIds[array_rand($clientIds)];
            $svcData = $services[array_search($svc, $serviceIds)];
            $date = now()->subDays(rand(0, 30))->setTime(rand(9, 16), [0, 30][rand(0, 1)]);
            $endDate = (clone $date)->addMinutes($svcData['duration']);
            $isPaid = in_array($statuses[$i % 5], ['completed']) && rand(0, 1);
            $price = $svcData['price'];

            DB::table('appointments')->insert([
                'id' => $apptId, 'business_id' => $bizId, 'branch_id' => $branchId,
                'client_id' => $client, 'employee_id' => $emp, 'service_id' => $svc,
                'start_time' => $date, 'end_time' => $endDate,
                'status' => $statuses[$i % 5], 'payment_status' => $isPaid ? 'paid' : 'unpaid',
                'created_at' => $date, 'updated_at' => $date,
            ]);

            if ($isPaid) {
                DB::table('transactions')->insert([
                    'id' => $uuid(), 'business_id' => $bizId, 'branch_id' => $branchId,
                    'appointment_id' => $apptId, 'total_amount' => $price,
                    'local_amount' => round($price * 0.5, 2),
                    'employee_amount' => round($price * 0.5, 2),
                    'local_percentage' => 50, 'employee_percentage' => 50,
                    'method' => ['cash', 'card', 'transfer'][rand(0, 2)],
                    'exchange_rate_used' => 1, 'paid_at' => $date, 'created_by' => $adminId,
                    'created_at' => $date,
                ]);
                $txCount++;
            }
        }
        $this->command->info("20 citas + {$txCount} transacciones creadas");

        // ── Expenses (5) ──
        $expenseNames = ['Alquiler local', 'Compra de productos', 'Servicio de internet', 'Publicidad Instagram', 'Mantenimiento aire'];
        foreach ($expenseNames as $i => $name) {
            DB::table('expenses')->insert([
                'id' => $uuid(), 'business_id' => $bizId, 'branch_id' => $branchId,
                'name' => $name, 'category' => ['Fijos', 'Insumos', 'Fijos', 'Marketing', 'Fijos'][$i],
                'amount' => [500, 200, 50, 80, 120][$i],
                'expense_date' => now()->subDays(rand(0, 30)),
                'currency' => 'USD', 'created_by' => $adminId,
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }
        $this->command->info('5 gastos creados');

        // ── Employee payments (3) ──
        foreach (array_slice($employeeIds, 0, 3) as $i => $eid) {
            DB::table('employee_payments')->insert([
                'id' => $uuid(), 'business_id' => $bizId, 'branch_id' => $branchId,
                'employee_id' => $eid, 'amount' => [150, 200, 300][$i],
                'currency' => 'USD', 'payment_method' => 'cash', 'type' => 'payment',
                'concept' => 'Pago de nómina', 'payment_date' => now()->subDays(rand(0, 5)),
                'created_by' => $adminId, 'created_at' => $now, 'updated_at' => $now,
            ]);
        }
        $this->command->info('3 pagos a empleados creados');

        // ── Supplier payments (2) ──
        DB::table('supplier_payments')->insert([
            [
                'id' => $uuid(), 'business_id' => $bizId, 'branch_id' => $branchId,
                'supplier_id' => $sup1, 'amount' => 150, 'payment_method' => 'transfer',
                'payment_date' => now()->subDays(5), 'created_by' => $adminId,
                'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'id' => $uuid(), 'business_id' => $bizId, 'branch_id' => $branchId,
                'supplier_id' => $sup2, 'amount' => 200, 'payment_method' => 'cash',
                'payment_date' => now()->subDays(10), 'created_by' => $adminId,
                'created_at' => $now, 'updated_at' => $now,
            ],
        ]);
        $this->command->info('2 pagos a proveedores creados');

        $this->command->info('');
        $this->command->info('✅ ¡Negocio demo listo!');
        $this->command->info('   Admin: admin@luma.app / password');
        $this->command->info('   Empleados: carlos@luma.app, maria@luma.app, etc. / password');
        $this->command->info('   Superadmin: superadmin@luma.app / password');
    }
}
