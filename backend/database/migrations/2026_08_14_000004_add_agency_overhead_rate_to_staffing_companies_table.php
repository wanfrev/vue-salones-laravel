<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The weekly report's "4%" — the agency's own overhead/margin rate applied to gross profit
 * (invoice - nomina), not to be confused with the employee withholding already modeled by
 * staffing_companies.tax_brackets. Kept per-company (not a hardcoded constant) and editable,
 * since it is a judgment call pending confirmation from the client — see StaffingReportService.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('staffing_companies', 'agency_overhead_rate')) {
            return;
        }

        Schema::table('staffing_companies', function (Blueprint $table) {
            $table->decimal('agency_overhead_rate', 6, 4)->nullable()->default(0.04)->after('overtime_multiplier');
        });
    }

    public function down(): void
    {
        Schema::table('staffing_companies', function (Blueprint $table) {
            $table->dropColumn('agency_overhead_rate');
        });
    }
};
