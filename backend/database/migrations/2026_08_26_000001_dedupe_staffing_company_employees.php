<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Cleans up literal duplicate rows in staffing_company_employees — the same
 * (company, employee, project, role, shift) stored more than once — which made a single worker
 * (e.g. Edwin Reyes at Lewis Electrical, project 2982) render three "duplicate" rows in Nómina's
 * roster, one per assignment.
 *
 * These duplicates predate the frontend submit gate (EmpleadoFormModal::hasDuplicateAssignment)
 * and the unique index from 2026_08_24_000001, so neither could have stopped them from being
 * written in the first place. Two assignments that are identical once saved are indistinguishable
 * to StaffingCompanyEmployeeService::assignmentFor(), so leaving them in place also makes Nómina
 * fail to save (two grid rows resolve to the same assignment and collide on
 * StaffingTimesheetEntry's unique (timesheet_id, employee_id, role, shift) index).
 *
 * The window function keeps the earliest row (created_at, then id) of every group and deletes the
 * rest. NULL project_id/shift are grouped together, matching the unique index's COALESCE. The
 * unique guard is then (re)created idempotently so this can never recur even on a VPS where
 * 2026_08_24_000001 was applied out of order or skipped.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            DELETE FROM staffing_company_employees
            WHERE id IN (
                SELECT id
                FROM (
                    SELECT id,
                           ROW_NUMBER() OVER (
                               PARTITION BY company_id, employee_id, project_id, role, shift
                               ORDER BY created_at ASC, id ASC
                           ) AS rn
                    FROM staffing_company_employees
                ) ranked
                WHERE rn > 1
            )
        SQL);

        DB::statement('DROP INDEX IF EXISTS staffing_company_employees_assignment_unique');

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
        // One-way data cleanup — the deleted duplicate rows cannot be restored.
    }
};
