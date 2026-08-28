<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-diem and travel pay are reimbursement-style amounts paid to the employee alongside their
 * wages, but never billed to the client — see StaffingPayrollCalculator::payroll(), which folds
 * both into `net`/`payout` while StaffingPayrollCalculator::invoice() never references them.
 *
 * hours_manual_override lets an admin type regular_hours/overtime_hours directly for one entry
 * instead of them being derived from total_hours by StaffingPayrollCalculator::splitHours().
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staffing_timesheet_entries', function (Blueprint $table) {
            if (!Schema::hasColumn('staffing_timesheet_entries', 'hours_manual_override')) {
                $table->boolean('hours_manual_override')->default(false)->after('overtime_hours');
            }
            if (!Schema::hasColumn('staffing_timesheet_entries', 'perdiem_days')) {
                $table->decimal('perdiem_days', 10, 2)->default(0)->after('hours_manual_override');
            }
            if (!Schema::hasColumn('staffing_timesheet_entries', 'perdiem_total')) {
                $table->decimal('perdiem_total', 15, 2)->default(0)->after('perdiem_days');
            }
            if (!Schema::hasColumn('staffing_timesheet_entries', 'travel_hours')) {
                $table->decimal('travel_hours', 10, 2)->default(0)->after('perdiem_total');
            }
            if (!Schema::hasColumn('staffing_timesheet_entries', 'travel_total')) {
                $table->decimal('travel_total', 15, 2)->default(0)->after('travel_hours');
            }
        });
    }

    public function down(): void
    {
        Schema::table('staffing_timesheet_entries', function (Blueprint $table) {
            $table->dropColumn(['hours_manual_override', 'perdiem_days', 'perdiem_total', 'travel_hours', 'travel_total']);
        });
    }
};
