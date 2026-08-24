<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The original `unique(['company_id', 'employee_id'])` predates `project_id`/`shift` and only
 * ever allowed ONE assignment per (company, employee) — full stop. That's wrong for a worker
 * holding two roles at the same client company (e.g. two different projects, or two shifts),
 * which StaffingEmployeeFields.vue's UI already lets an admin build. Saving that second
 * assignment hit this constraint and rolled back the whole employee save.
 *
 * Widened to only block a literal duplicate row (same company/employee/project/role/shift).
 * `project_id`/`shift` are nullable, and plain SQL unique constraints treat every NULL as
 * distinct from every other NULL — so a plain multi-column unique() would silently let two
 * identical no-project/no-shift rows through. Using COALESCE to a sentinel in an expression
 * index makes those NULLs compare equal, so true duplicates are still rejected.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staffing_company_employees', function (Blueprint $table) {
            $table->dropUnique(['company_id', 'employee_id']);
        });

        DB::statement(<<<'SQL'
            CREATE UNIQUE INDEX staffing_company_employees_assignment_unique
            ON staffing_company_employees (
                company_id,
                employee_id,
                COALESCE(project_id::text, ''),
                role,
                COALESCE(shift, '')
            )
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS staffing_company_employees_assignment_unique');

        Schema::table('staffing_company_employees', function (Blueprint $table) {
            $table->unique(['company_id', 'employee_id']);
        });
    }
};
