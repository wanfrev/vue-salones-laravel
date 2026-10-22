<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Índices para el historial de visitas por cliente (ClientVisitService), que siempre filtra por
 * negocio + cliente y ordena por fecha. Solo agrega índices: no toca datos ni columnas.
 * IF NOT EXISTS por si alguno ya se creó a mano; solo Postgres (las pruebas usan SQLite).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        if (Schema::hasTable('appointments')) {
            DB::statement('CREATE INDEX IF NOT EXISTS appointments_business_client_start_idx ON appointments (business_id, client_id, start_time DESC)');
        }
        if (Schema::hasTable('inventory_movements')) {
            DB::statement('CREATE INDEX IF NOT EXISTS inventory_movements_business_client_ref_idx ON inventory_movements (business_id, client_id, reference_type) WHERE client_id IS NOT NULL');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('DROP INDEX IF EXISTS appointments_business_client_start_idx');
        DB::statement('DROP INDEX IF EXISTS inventory_movements_business_client_ref_idx');
    }
};
