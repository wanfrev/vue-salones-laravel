<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-employee tax override for the staffing niche. Null (the default) means "use the
 * company's tax_brackets" — see StaffingTimesheetService::saveWeek, which builds a flat
 * TaxRule from this value when set and falls back to the company's tiered rule otherwise.
 * Stored as a fraction (0.07 = 7%), matching staffing_companies.tax_brackets[].rate.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('profiles', 'staffing_tax_rate')) {
            return;
        }

        Schema::table('profiles', function (Blueprint $table) {
            $table->decimal('staffing_tax_rate', 6, 4)->nullable()->after('staffing_role');
        });
    }

    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->dropColumn('staffing_tax_rate');
        });
    }
};
