<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Optional per-role overtime terms. Null (the default, and every existing row) means "use the
 * company's overtime_threshold_hours/overtime_multiplier" — see StaffingTimesheetService and
 * StaffingPayrollCalculator, which resolve the entry-level override before falling back to
 * PayrollTerms. A role that genuinely works different OT rules than the rest of the company
 * (e.g. a foreman on a 45h week) can now say so without changing the company-wide default.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('staffing_company_rates', 'overtime_threshold_hours')) {
            return;
        }

        Schema::table('staffing_company_rates', function (Blueprint $table) {
            $table->decimal('overtime_threshold_hours', 8, 2)->nullable()->after('bill_rate');
            $table->decimal('overtime_multiplier', 8, 2)->nullable()->after('overtime_threshold_hours');
        });
    }

    public function down(): void
    {
        Schema::table('staffing_company_rates', function (Blueprint $table) {
            $table->dropColumn(['overtime_threshold_hours', 'overtime_multiplier']);
        });
    }
};
