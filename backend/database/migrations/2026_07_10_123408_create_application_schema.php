<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $sql = file_get_contents(__DIR__ . '/../schema_filtered.sql');

        // Replace Supabase auth.uid() references with a placeholder that won't break
        $sql = str_replace('auth.uid()', 'auth.uid()', $sql);

        DB::unprepared($sql);
    }

    public function down(): void
    {
        $tables = [
            'appointment_services', 'appointments', 'branches', 'businesses',
            'cache', 'cache_locks', 'client_preferred_services', 'clients',
            'employee_absences', 'employee_payments', 'employee_schedules',
            'employee_services', 'expenses', 'failed_jobs', 'gift_cards',
            'inventory_locations', 'inventory_movements', 'inventory_stock',
            'job_batches', 'jobs', 'migrations', 'notifications',
            'password_reset_tokens', 'personal_access_tokens',
            'product_categories', 'product_variants', 'products', 'profiles',
            'service_categories', 'service_variants', 'services', 'sessions',
            'supplier_payments', 'suppliers', 'transactions', 'users',
        ];

        foreach ($tables as $table) {
            DB::statement("DROP TABLE IF EXISTS public.{$table} CASCADE");
        }

        $types = [
            'app_role', 'appointment_source', 'appointment_status',
            'employee_absence_type', 'inventory_movement_type',
            'payment_method', 'payment_status',
        ];

        foreach ($types as $type) {
            DB::statement("DROP TYPE IF EXISTS public.{$type}");
        }
    }
};
