<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * A worker can now hold two roles at the same company (see
 * 2026_08_24_000001_widen_staffing_company_employees_unique_constraint) — Nómina needs one
 * timesheet entry per (employee, role), not one per employee, so the same person can log hours
 * separately for each role in the same week. `role` is a snapshot at save time, same convention
 * as `pay_rate`/`bill_rate` on this table.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staffing_timesheet_entries', function (Blueprint $table) {
            $table->string('role')->nullable()->after('employee_id');
        });

        Schema::table('staffing_timesheet_entries', function (Blueprint $table) {
            $table->dropUnique('unique_staffing_entry_timesheet_employee');
        });

        DB::statement(<<<'SQL'
            CREATE UNIQUE INDEX unique_staffing_entry_timesheet_employee_role
            ON staffing_timesheet_entries (timesheet_id, employee_id, COALESCE(role, ''))
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS unique_staffing_entry_timesheet_employee_role');

        Schema::table('staffing_timesheet_entries', function (Blueprint $table) {
            $table->unique(['timesheet_id', 'employee_id'], 'unique_staffing_entry_timesheet_employee');
            $table->dropColumn('role');
        });
    }
};
