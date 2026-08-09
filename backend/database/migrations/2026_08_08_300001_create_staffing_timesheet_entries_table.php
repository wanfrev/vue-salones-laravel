<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One employee's row on one timesheet — a single line of the NOMINA sheet. `pay_rate`/`bill_rate`
 * are a SNAPSHOT copied from the rate card when the hours were entered, not a live join: if the
 * company's rate changes next month, this row must keep reading the number that was actually
 * used to pay this person. Everything from `regular_hours` on is the calculator's output,
 * persisted so the list view never has to re-run App\Services\Staffing\StaffingPayrollCalculator
 * just to render a table.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('staffing_timesheet_entries')) {
            return;
        }

        Schema::create('staffing_timesheet_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('timesheet_id');
            $table->uuid('employee_id');

            $table->decimal('total_hours', 8, 2)->default(0);
            $table->decimal('pre_tax_deduction', 15, 2)->default(0);
            $table->decimal('fixed_fees', 15, 2)->default(0);
            $table->decimal('adjustment', 15, 2)->default(0);

            $table->decimal('pay_rate', 15, 2)->default(0);
            $table->decimal('bill_rate', 15, 2)->default(0);

            $table->decimal('regular_hours', 8, 2)->default(0);
            $table->decimal('overtime_hours', 8, 2)->default(0);
            $table->decimal('gross', 15, 2)->default(0);
            $table->decimal('tax_withheld', 15, 2)->default(0);
            $table->decimal('net', 15, 2)->default(0);
            $table->decimal('payout', 15, 2)->default(0);
            $table->decimal('carried', 15, 2)->default(0);
            $table->decimal('invoice_total', 15, 2)->default(0);
            $table->decimal('employer_cost', 15, 2)->default(0);
            $table->decimal('margin', 15, 2)->default(0);

            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
            $table->foreign('timesheet_id')->references('id')->on('staffing_timesheets')->onDelete('cascade');
            // Deliberately no cascade: employees are soft-deleted (profiles.active = false) in
            // this app, never hard-deleted, so payroll history is never expected to need to
            // survive its employee disappearing. Left unconstrained-on-delete (DB default
            // RESTRICT) as a backstop rather than silently losing history to a cascade.
            $table->foreign('employee_id')->references('id')->on('profiles');

            $table->unique(['timesheet_id', 'employee_id'], 'unique_staffing_entry_timesheet_employee');
            $table->index(['business_id', 'employee_id'], 'idx_staffing_entries_biz_employee');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staffing_timesheet_entries');
    }
};
