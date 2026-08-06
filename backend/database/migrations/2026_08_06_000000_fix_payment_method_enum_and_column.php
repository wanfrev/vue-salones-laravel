<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Garantiza que PostgreSQL reconozca binance, cashea y cualquier otro método de pago
 * en el ENUM `payment_method` y convierte las columnas relativas a `VARCHAR(50)`.
 */
return new class extends Migration
{
    /**
     * Requerido en PostgreSQL para ejecutar ALTER TYPE ... ADD VALUE fuera de un bloque transaccional.
     */
    public $withinTransaction = false;

    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        // 1. Ampliar el tipo ENUM `payment_method` si existe en PostgreSQL
        $methods = [
            'binance',
            'cashea',
            'zelle',
            'cash_ves',
            'pago_movil',
            'punto_venta',
            'gift_card',
            'mixed',
            'card',
            'transfer',
            'cash',
            'other',
        ];

        foreach ($methods as $method) {
            try {
                DB::statement("ALTER TYPE payment_method ADD VALUE IF NOT EXISTS '{$method}';");
            } catch (\Throwable $e) {
                // Si el tipo ENUM no existe en este entorno, continuar silenciosamente
            }
        }

        // 2. Convertir la columna `method` de `transactions` a VARCHAR(50)
        if (Schema::hasTable('transactions') && Schema::hasColumn('transactions', 'method')) {
            try {
                foreach ($this->methodCheckConstraints() as $name) {
                    DB::statement("ALTER TABLE transactions DROP CONSTRAINT IF EXISTS \"{$name}\"");
                }

                DB::statement('ALTER TABLE transactions ALTER COLUMN method TYPE VARCHAR(50) USING method::varchar');
            } catch (\Throwable $e) {
            }
        }

        // 3. Alterar `employee_payments.payment_method` si usa ENUM
        if (Schema::hasTable('employee_payments') && Schema::hasColumn('employee_payments', 'payment_method')) {
            try {
                DB::statement('ALTER TABLE employee_payments ALTER COLUMN payment_method TYPE VARCHAR(50) USING payment_method::varchar');
            } catch (\Throwable $e) {
            }
        }

        // 4. Alterar `supplier_payments.payment_method` si usa ENUM
        if (Schema::hasTable('supplier_payments') && Schema::hasColumn('supplier_payments', 'payment_method')) {
            try {
                DB::statement('ALTER TABLE supplier_payments ALTER COLUMN payment_method TYPE VARCHAR(50) USING payment_method::varchar');
            } catch (\Throwable $e) {
            }
        }
    }

    public function down(): void
    {
    }

    /**
     * @return array<int, string>
     */
    private function methodCheckConstraints(): array
    {
        $rows = DB::select(<<<'SQL'
            SELECT con.conname AS name
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
            WHERE rel.relname = 'transactions'
              AND nsp.nspname = current_schema()
              AND con.contype = 'c'
              AND pg_get_constraintdef(con.oid) ILIKE '%method%'
        SQL);

        return array_map(fn ($row) => $row->name, $rows);
    }
};
