<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Staffing's Finanzas > Ingresos is normally derived entirely from invoiced hours
 * (staffing_timesheet_entries.invoice_total), but the PDF also asks for a manual entry option —
 * e.g. a one-off payment from a company that never went through the nómina/invoice flow.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('staffing_manual_incomes')) {
            return;
        }

        Schema::create('staffing_manual_incomes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');

            $table->date('income_date');
            $table->decimal('amount', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();

            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
            $table->index(['business_id', 'income_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staffing_manual_incomes');
    }
};
