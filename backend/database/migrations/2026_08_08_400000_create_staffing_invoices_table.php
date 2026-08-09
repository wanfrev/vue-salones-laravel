<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The document Delta sends the client company — the INVOICE PRUEBA.xlsx sheet. Generated from
 * one approved timesheet (one week, one company), never written by hand: `subtotal`/`total`
 * are the sum of that week's entries.invoice_total, which already bills overtime at 1.5x the
 * bill rate the way the CWT sheet does.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('staffing_invoices')) {
            return;
        }

        Schema::create('staffing_invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('company_id');
            $table->uuid('timesheet_id');

            $table->string('invoice_number');
            $table->date('issue_date');
            $table->date('due_date');
            $table->unsignedSmallInteger('terms_days')->default(15);
            $table->string('work_site')->nullable();

            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->string('status')->default('sent'); // sent | partial | paid

            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
            $table->foreign('company_id')->references('id')->on('staffing_companies')->onDelete('cascade');
            $table->foreign('timesheet_id')->references('id')->on('staffing_timesheets')->onDelete('cascade');

            // One invoice per timesheet — a week is billed once.
            $table->unique('timesheet_id', 'unique_staffing_invoice_timesheet');
            // Invoice numbers are only unique within one agency's own sequence.
            $table->unique(['business_id', 'invoice_number'], 'unique_staffing_invoice_business_number');
            $table->index(['business_id', 'company_id'], 'idx_staffing_invoices_biz_company');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staffing_invoices');
    }
};
