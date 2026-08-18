<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Some client companies run the same role at different rates by shift (día/tarde/noche) — the
 * agency bills and pays differently for a night-shift Operario than a day-shift one. `shift` is
 * nullable: a company that doesn't split by shift just keeps its one row per role with shift
 * null, exactly as before. NULL is excluded from uniqueness checks in Postgres, so a company can
 * freely mix shift-less roles and shift-split roles.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('staffing_company_rates', 'shift')) {
            return;
        }

        Schema::table('staffing_company_rates', function (Blueprint $table) {
            // 'dia' | 'tarde' | 'noche' | null (no shift distinction for this role)
            $table->string('shift')->nullable()->after('role');
        });

        Schema::table('staffing_company_rates', function (Blueprint $table) {
            $table->dropUnique('unique_staffing_rate_company_role');
            $table->unique(['company_id', 'role', 'shift'], 'unique_staffing_rate_company_role_shift');
        });
    }

    public function down(): void
    {
        Schema::table('staffing_company_rates', function (Blueprint $table) {
            $table->dropUnique('unique_staffing_rate_company_role_shift');
        });

        Schema::table('staffing_company_rates', function (Blueprint $table) {
            $table->unique(['company_id', 'role'], 'unique_staffing_rate_company_role');
            $table->dropColumn('shift');
        });
    }
};
