<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Credits could only ever be settled in one shot (markPaid), which also overwrote the *original*
 * sale transaction's amount/date/method with the payment's — losing when the sale actually
 * happened, and making a partial abono impossible (there's nowhere to record "$20 of $50 paid
 * today, rest later"). credits.paid_amount tracks the running total across abonos;
 * credit_payments is the history (one row per abono), each linked to its OWN transaction — the
 * original sale transaction is never touched again after the sale.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('credits', function (Blueprint $table) {
            $table->decimal('paid_amount', 12, 2)->default(0)->after('amount');
        });

        Schema::create('credit_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('credit_id');
            $table->uuid('transaction_id');
            $table->decimal('amount', 12, 2);
            $table->string('method');
            $table->string('currency', 10)->default('USD');
            $table->decimal('exchange_rate', 12, 4)->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('business_id')->references('id')->on('businesses')->cascadeOnDelete();
            $table->foreign('credit_id')->references('id')->on('credits')->cascadeOnDelete();
            $table->foreign('transaction_id')->references('id')->on('transactions')->cascadeOnDelete();
            $table->unique('transaction_id');
            $table->index(['business_id', 'credit_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('credit_payments');

        Schema::table('credits', function (Blueprint $table) {
            $table->dropColumn('paid_amount');
        });
    }
};
