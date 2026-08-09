<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A payment a client company made toward what it owes the agency — an abono (partial) or a full
 * settlement. `invoice_id` is nullable: a payment can apply to one specific invoice or sit as a
 * payment on account against the company's running balance, same as SupplierPayment's relationship
 * to Supplier.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('staffing_company_payments')) {
            return;
        }

        Schema::create('staffing_company_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('company_id');
            $table->uuid('invoice_id')->nullable();

            $table->decimal('amount', 15, 2);
            $table->string('payment_method')->nullable();
            $table->date('payment_date');
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();

            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
            $table->foreign('company_id')->references('id')->on('staffing_companies')->onDelete('cascade');
            $table->foreign('invoice_id')->references('id')->on('staffing_invoices')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');

            $table->index(['business_id', 'company_id'], 'idx_staffing_company_payments_biz_company');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staffing_company_payments');
    }
};
