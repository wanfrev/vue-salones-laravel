<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Índice para el historial de compras por producto (ProductSalesHistoryService): siempre filtra por negocio,
 * solo ventas (`movement_type = 'sale'`) y un rango de fechas. Parcial para que ocupe poco (solo ventas, no
 * compras ni ajustes). Solo agrega un índice: no toca datos ni columnas. IF NOT EXISTS por si ya se creó a mano;
 * solo Postgres (las pruebas usan SQLite).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql' || !Schema::hasTable('inventory_movements')) {
            return;
        }

        DB::statement("CREATE INDEX IF NOT EXISTS inventory_movements_sales_history_idx ON inventory_movements (business_id, created_at DESC, product_id) WHERE movement_type = 'sale'");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('DROP INDEX IF EXISTS inventory_movements_sales_history_idx');
    }
};
