<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cómo se pagó una gift card al venderla (efectivo, Zelle, pago móvil…). Hasta ahora solo se guardaba la tarjeta, así
 * que ese dinero no aparecía en ningún cuadre. Es dinero RECIBIDO, no ingreso: el ingreso se reconoce cuando la gift
 * card se usa en el POS (método «Gift Card»), por eso esto vive aparte de `transactions` y no toca Finanzas.
 *
 * Una fila por gift card. `payments_breakdown` usa el mismo formato que el POS (method, currency, inputAmount, amount,
 * bank_id, bank_name) para que el Cuadre del Día lo lea igual que un cobro.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gift_card_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('branch_id')->nullable();
            $table->uuid('gift_card_id');
            $table->decimal('amount', 12, 2);
            $table->json('payments_breakdown');
            $table->decimal('exchange_rate', 12, 4)->nullable();
            $table->timestamp('paid_at');
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->cascadeOnDelete();
            $table->foreign('gift_card_id')->references('id')->on('gift_cards')->cascadeOnDelete();
            $table->unique('gift_card_id');
            $table->index(['business_id', 'paid_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gift_card_payments');
    }
};
