<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One company's one week — the NOMINA sheet itself. `draft` is editable and recomputed live
 * every time hours change; `approved` freezes the numbers (via terms_snapshot) so a later edit
 * to the company's rates or tax brackets can never retroactively change payroll that already
 * went out. `paid` marks the week as settled once the payout has actually gone out.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('staffing_timesheets')) {
            return;
        }

        Schema::create('staffing_timesheets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('company_id');

            $table->date('week_start');
            $table->date('week_end');
            $table->string('status')->default('draft'); // draft | approved | paid

            // The company's overtime/tax/rounding rules at the moment this was approved — see
            // App\Services\Staffing\StaffingTermsFactory. Null while still a draft, where the
            // live company row is the source of truth instead.
            $table->jsonb('terms_snapshot')->nullable();

            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
            $table->foreign('company_id')->references('id')->on('staffing_companies')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');

            // One timesheet per company per week — re-opening a week edits it, it doesn't fork it.
            $table->unique(['company_id', 'week_start'], 'unique_staffing_timesheet_company_week');
            $table->index(['business_id', 'company_id', 'week_start'], 'idx_staffing_timesheets_biz_company_week');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staffing_timesheets');
    }
};
