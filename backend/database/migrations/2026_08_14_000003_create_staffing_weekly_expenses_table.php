<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "Otros gastos" on the weekly staffing report — a manual, editable expense per (company, week)
 * that has no other home. Not derived from timesheets/invoices, on purpose: the client's
 * spreadsheet treats it as a free-entry adjustment on top of the auto-filled numbers.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('staffing_weekly_expenses')) {
            return;
        }

        Schema::create('staffing_weekly_expenses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('company_id');

            $table->date('week_start');
            $table->decimal('amount', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();

            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
            $table->foreign('company_id')->references('id')->on('staffing_companies')->onDelete('cascade');

            $table->unique(['company_id', 'week_start'], 'unique_staffing_weekly_expense_company_week');
            $table->index(['business_id', 'week_start'], 'idx_staffing_weekly_expenses_biz_week');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staffing_weekly_expenses');
    }
};
