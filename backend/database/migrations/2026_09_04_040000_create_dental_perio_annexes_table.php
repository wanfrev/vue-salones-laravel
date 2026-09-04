<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dental_perio_annexes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('branch_id')->nullable();
            $table->uuid('client_id');
            $table->uuid('created_by')->nullable();

            // Sección A del PDF.
            $table->jsonb('condiciones_clinicas')->default('{}');
            // Sección B.
            $table->jsonb('factores_riesgo')->default('{}');
            // Sección D (diagnóstico, pronóstico, plan de tratamiento por fases).
            $table->jsonb('diagnostico')->default('{}');
            $table->text('observaciones_generales')->nullable();

            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->cascadeOnDelete();
            $table->foreign('branch_id')->references('id')->on('branches')->nullOnDelete();
            $table->foreign('client_id')->references('id')->on('clients')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['business_id', 'client_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dental_perio_annexes');
    }
};
