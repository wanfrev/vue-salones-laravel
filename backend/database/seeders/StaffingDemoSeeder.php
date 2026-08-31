<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StaffingDemoSeeder extends Seeder
{
    public function run(): void
    {
        $uuid = fn() => Str::uuid()->toString();
        $now = now();

        $bizId = '20000000-0000-0000-0000-000000000001';
        $adminId = '20000000-0000-0000-0000-000000000002';
        $branchId = '20000000-0000-0000-0000-000000000003';

        if (DB::table('businesses')->where('id', $bizId)->exists()) {
            $this->command->info('Negocio Staffing demo ya existe, saltando...');
            return;
        }

        // ── Business ──
        DB::table('businesses')->insert([
            'id' => $bizId, 'name' => 'Delta Work Force', 'slug' => 'delta-work-force',
            'phone' => '+13051234567', 'address' => '123 Main St, Miami, FL',
            'timezone' => 'America/New_York', 'currency' => 'USD',
            'ves_exchange_rate' => 1, 'niche_type' => 'staffing',
            'theme_config' => json_encode(['primary' => '#869C84', 'secondary' => '#2D3A29']),
            'terminology' => json_encode(['client' => 'Company', 'employee' => 'Worker', 'service' => 'Role']),
            'job_titles' => json_encode(['Construction', 'Cleaning', 'Driver', 'Warehouse']),
            'features' => json_encode(['pos' => false, 'inventario' => false, 'productos' => false, 'proveedores' => false, 'multi_branch' => false, 'gift_cards' => false, 'employees_create_clients' => false, 'employees_see_clients' => false]),
            'active' => true, 'created_at' => $now, 'updated_at' => $now,
        ]);

        // ── Admin user ──
        DB::table('users')->insert([
            'id' => $adminId, 'name' => 'Admin Staffing', 'email' => 'staffing@prueba.com',
            'password' => bcrypt('123456'), 'created_at' => $now, 'updated_at' => $now,
        ]);
        DB::table('profiles')->insert([
            'id' => $adminId, 'business_id' => $bizId, 'full_name' => 'Admin Staffing',
            'role' => 'admin', 'email' => 'staffing@prueba.com', 'active' => true, 'created_at' => $now, 'updated_at' => $now,
        ]);

        // ── Branch ──
        DB::table('branches')->insert([
            'id' => $branchId, 'business_id' => $bizId, 'name' => 'Miami HQ',
            'address' => '123 Main St, Miami, FL', 'is_default' => true, 'active' => true,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        // ── Staffing Companies (2) ──
        $companies = [
            [
                'name' => 'Alpha Construction LLC', 'legal_name' => 'Alpha Construction LLC',
                'address' => '456 Build Ave', 'city' => 'Miami', 'state' => 'FL', 'zip' => '33101',
                'payment_terms_days' => 15, 'tax_rate' => 0.04, 'status' => 'active'
            ],
            [
                'name' => 'Omega Warehousing', 'legal_name' => 'Omega Warehousing Inc.',
                'address' => '789 Storage Blvd', 'city' => 'Miami', 'state' => 'FL', 'zip' => '33102',
                'payment_terms_days' => 30, 'tax_rate' => 0.05, 'status' => 'active'
            ]
        ];

        $companyIds = [];
        foreach ($companies as $comp) {
            $cid = $uuid(); $companyIds[] = $cid;
            DB::table('staffing_companies')->insert([
                'id' => $cid, 'business_id' => $bizId, 'name' => $comp['name'],
                'legal_name' => $comp['legal_name'], 'address' => $comp['address'],
                'city' => $comp['city'], 'state' => $comp['state'], 'zip' => $comp['zip'],
                'payment_terms_days' => $comp['payment_terms_days'], 'tax_rate' => $comp['tax_rate'],
                'payout_rounding' => 'cent', 'status' => $comp['status'], 'active' => true,
                'created_at' => $now, 'updated_at' => $now,
            ]);

            // Rates for this company
            DB::table('staffing_company_rates')->insert([
                ['id' => $uuid(), 'business_id' => $bizId, 'company_id' => $cid, 'role' => 'General Labor', 'shift' => 'dia', 'pay_rate' => 15, 'bill_rate' => 25, 'active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['id' => $uuid(), 'business_id' => $bizId, 'company_id' => $cid, 'role' => 'General Labor', 'shift' => 'noche', 'pay_rate' => 18, 'bill_rate' => 30, 'active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['id' => $uuid(), 'business_id' => $bizId, 'company_id' => $cid, 'role' => 'Supervisor', 'shift' => 'dia', 'pay_rate' => 25, 'bill_rate' => 45, 'active' => true, 'created_at' => $now, 'updated_at' => $now],
            ]);
            
            // Projects
            DB::table('staffing_projects')->insert([
                ['id' => $uuid(), 'business_id' => $bizId, 'company_id' => $cid, 'name' => 'Project A - ' . $comp['name'], 'active' => true, 'created_at' => $now, 'updated_at' => $now],
            ]);
        }
        $this->command->info('Empresas de Staffing creadas');

        // ── Staffing Employees (10) ──
        $employees = ['Juan Perez', 'Maria Garcia', 'Carlos Rodriguez', 'Ana Lopez', 'Luis Hernandez', 'Elena Ramirez', 'Miguel Torres', 'Sofia Flores', 'Jorge Diaz', 'Lucia Cruz'];
        $employeeIds = [];
        foreach ($employees as $i => $empName) {
            $eid = $uuid();
            $employeeIds[] = $eid;
            $email = strtolower(str_replace(' ', '.', $empName)) . '@worker.app';
            DB::table('users')->insert([
                'id' => $eid, 'name' => $empName, 'email' => $email,
                'password' => bcrypt('password'), 'created_at' => $now, 'updated_at' => $now,
            ]);
            DB::table('profiles')->insert([
                'id' => $eid, 'business_id' => $bizId, 'full_name' => $empName,
                'role' => 'empleado', 'email' => $email, 'phone' => '+130500000' . str_pad($i, 2, '0', STR_PAD_LEFT),
                'job_title' => 'General Labor', 'pay_type' => 'salary', // Staffing doesn't typically use percentage within the app, pay comes from Timesheets
                'pay_percentage' => 0, 'base_salary' => 0,
                'active' => true, 'created_at' => $now, 'updated_at' => $now,
            ]);
        }
        $this->command->info('10 empleados de staffing creados');

        // ── Timesheets & Payroll (Past 4 weeks for Company 1) ──
        $cid = $companyIds[0];
        $startDate = now()->subWeeks(4)->startOfWeek();
        
        for ($w = 0; $w < 4; $w++) {
            $weekStart = $startDate->copy()->addWeeks($w)->format('Y-m-d');
            $weekEnd = $startDate->copy()->addWeeks($w)->endOfWeek()->format('Y-m-d');
            $timesheetId = $uuid();
            
            // Create Timesheet
            DB::table('staffing_timesheets')->insert([
                'id' => $timesheetId, 'business_id' => $bizId, 'company_id' => $cid,
                'week_start' => $weekStart, 'week_end' => $weekEnd,
                'status' => 'paid', 'created_by' => $adminId,
                'created_at' => $now, 'updated_at' => $now,
            ]);
            
            $totalPayroll = 0;
            $totalInvoice = 0;

            // Entries for 5 employees
            for ($e = 0; $e < 5; $e++) {
                $eid = $employeeIds[$e];
                $hours = rand(30, 45);
                $payRate = 15;
                $billRate = 25;
                $otHours = max(0, $hours - 40);
                $regHours = $hours - $otHours;
                
                $payrollLine = ($regHours * $payRate) + ($otHours * $payRate * 1.5);
                $invoiceLine = ($regHours * $billRate) + ($otHours * $billRate * 1.5);
                
                $totalPayroll += $payrollLine;
                $totalInvoice += $invoiceLine;

                DB::table('staffing_timesheet_entries')->insert([
                    'id' => $uuid(), 'timesheet_id' => $timesheetId, 'employee_id' => $eid,
                    'role' => 'General Labor', 'shift' => 'dia', 'total_hours' => $hours,
                    'pay_rate' => $payRate, 'bill_rate' => $billRate, 'gross_amount' => $payrollLine,
                    'net_amount' => $payrollLine, 'invoice_amount' => $invoiceLine,
                    'created_at' => $now, 'updated_at' => $now,
                ]);
            }
            
            // Create Invoice
            $invoiceId = $uuid();
            $dueDate = $startDate->copy()->addWeeks($w)->addDays(15)->format('Y-m-d');
            DB::table('staffing_invoices')->insert([
                'id' => $invoiceId, 'business_id' => $bizId, 'company_id' => $cid,
                'timesheet_id' => $timesheetId, 'invoice_number' => 'INV-100' . $w,
                'issue_date' => $weekEnd, 'due_date' => $dueDate,
                'total_amount' => $totalInvoice, 'status' => 'paid',
                'created_at' => $now, 'updated_at' => $now,
            ]);
            
            // Create Payment for Invoice
            DB::table('staffing_company_payments')->insert([
                'id' => $uuid(), 'business_id' => $bizId, 'company_id' => $cid,
                'invoice_id' => $invoiceId, 'amount' => $totalInvoice,
                'payment_date' => $dueDate, 'payment_method' => 'bank_transfer',
                'reference' => 'TXN-' . rand(1000, 9999),
                'created_by' => $adminId, 'created_at' => $now, 'updated_at' => $now,
            ]);
        }
        $this->command->info('Reportes, Nomina y Facturas creadas');
        
        // ── Vendedoras (CRM) ──
        $vid = $uuid();
        DB::table('users')->insert([
            'id' => $vid, 'name' => 'Vendedora CRM', 'email' => 'ventas@prueba.com',
            'password' => bcrypt('password'), 'created_at' => $now, 'updated_at' => $now,
        ]);
        DB::table('profiles')->insert([
            'id' => $vid, 'business_id' => $bizId, 'full_name' => 'Vendedora CRM',
            'role' => 'empleado', 'email' => 'ventas@prueba.com', 'active' => true, 'created_at' => $now, 'updated_at' => $now,
        ]);
        
        DB::table('leads')->insert([
            ['id' => $uuid(), 'business_id' => $bizId, 'owner_id' => $vid, 'company_name' => 'Future Build LLC', 'status' => 'new', 'priority' => 'high', 'created_at' => $now, 'updated_at' => $now],
            ['id' => $uuid(), 'business_id' => $bizId, 'owner_id' => $vid, 'company_name' => 'Clean Sweep', 'status' => 'called', 'priority' => 'medium', 'created_at' => $now, 'updated_at' => $now],
        ]);
        $this->command->info('CRM de Ventas Poblado');

        $this->command->info('---');
        $this->command->info('Staffing Seeder completado con exito.');
        $this->command->info('Usuario: staffing@prueba.com');
        $this->command->info('Clave: 123456');
    }
}
