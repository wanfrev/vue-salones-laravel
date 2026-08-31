<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Perdiem and travel pay are no longer computed from days/hours × a rate — the admin types the
 * total dollar amount directly (see StaffingTimesheetService::saveWeek()). perdiem_total and
 * travel_total stay; the inputs that used to derive them are dropped.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staffing_timesheet_entries', function (Blueprint $table) {
            if (Schema::hasColumn('staffing_timesheet_entries', 'perdiem_days')) {
                $table->dropColumn('perdiem_days');
            }
            if (Schema::hasColumn('staffing_timesheet_entries', 'travel_hours')) {
                $table->dropColumn('travel_hours');
            }
        });
    }

    public function down(): void
    {
        Schema::table('staffing_timesheet_entries', function (Blueprint $table) {
            $table->decimal('perdiem_days', 10, 2)->default(0)->after('hours_manual_override');
            $table->decimal('travel_hours', 10, 2)->default(0)->after('perdiem_total');
        });
    }
};
