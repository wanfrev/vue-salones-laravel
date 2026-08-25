<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Mirrors 2026_08_25_000000_add_role_to_staffing_timesheet_entries_table, one level deeper: an
 * employee can now hold two assignments with the *same* role at a company that differ only by
 * shift (see 2026_08_24_000001_widen_staffing_company_employees_unique_constraint) — without a
 * `shift` column here, both assignments' hours collided into the same (timesheet, employee, role)
 * entry. `shift` is a snapshot at save time, same convention as `role`/`pay_rate`/`bill_rate`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staffing_timesheet_entries', function (Blueprint $table) {
            $table->string('shift')->nullable()->after('role');
        });

        // Not $table->dropUnique() — that issues ALTER TABLE ... DROP CONSTRAINT, but the prior
        // migration created this as a plain CREATE UNIQUE INDEX (to get the COALESCE expression),
        // not a table constraint, so Postgres won't recognize it as one.
        DB::statement('DROP INDEX IF EXISTS unique_staffing_entry_timesheet_employee_role');

        DB::statement(<<<'SQL'
            CREATE UNIQUE INDEX unique_staffing_entry_timesheet_employee_role_shift
            ON staffing_timesheet_entries (timesheet_id, employee_id, COALESCE(role, ''), COALESCE(shift, ''))
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS unique_staffing_entry_timesheet_employee_role_shift');

        DB::statement(<<<'SQL'
            CREATE UNIQUE INDEX unique_staffing_entry_timesheet_employee_role
            ON staffing_timesheet_entries (timesheet_id, employee_id, COALESCE(role, ''))
        SQL);

        Schema::table('staffing_timesheet_entries', function (Blueprint $table) {
            $table->dropColumn('shift');
        });
    }
};
