<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cobro del servicio de Luma a cada negocio (lo configura solo el superadmin).
 *
 * - business_billing_plans: un plan por negocio — mes gratis, primer pago, ciclo
 *   (mensual/trimestral/semestral/anual) con su monto, la próxima fecha de pago y qué días antes
 *   avisar. El aviso al negocio NO se guarda en ninguna tabla: se calcula al momento
 *   (BillingService::noticeFor), así no depende de que corra el programador de tareas.
 * - business_billing_payments: historial de pagos que el superadmin marca. Marcar un pago mueve
 *   next_due_on al siguiente ciclo; deshacer el último lo devuelve a la fecha que había cubierto.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('business_billing_plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id')->unique();
            $table->boolean('enabled')->default(false);
            $table->string('currency', 3)->default('USD');
            $table->date('trial_ends_on')->nullable();
            $table->decimal('initial_amount', 12, 2)->nullable();
            $table->string('cycle', 16)->default('monthly');
            $table->decimal('recurring_amount', 12, 2)->nullable();
            $table->date('next_due_on')->nullable();
            $table->boolean('next_is_initial')->default(true);
            $table->json('remind_days_before')->nullable();
            $table->text('payment_instructions')->nullable();
            $table->text('custom_message')->nullable();
            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->cascadeOnDelete();
        });

        Schema::create('business_billing_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('USD');
            $table->date('paid_on');
            $table->date('covered_due_on');
            $table->string('kind', 16)->default('recurring');
            $table->text('notes')->nullable();
            $table->uuid('recorded_by')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('business_id')->references('id')->on('businesses')->cascadeOnDelete();
            $table->index(['business_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('business_billing_payments');
        Schema::dropIfExists('business_billing_plans');
    }
};
