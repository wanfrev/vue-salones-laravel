<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->string('client_code', 20)->nullable();
        });

        // Único por negocio, pero solo cuando se define — es un campo opcional
        // (varios clientes sin código no deben chocar entre sí).
        DB::statement('CREATE UNIQUE INDEX clients_unique_code_idx ON public.clients (business_id, upper(client_code)) WHERE client_code IS NOT NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS public.clients_unique_code_idx');

        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn('client_code');
        });
    }
};
