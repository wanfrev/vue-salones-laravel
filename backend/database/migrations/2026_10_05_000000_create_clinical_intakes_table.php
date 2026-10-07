<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clinical_intakes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('branch_id')->nullable();
            $table->uuid('client_id');
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();

            // Historia clínica psicológica completa (motivo de consulta, antecedentes, riesgo...).
            // `text` y no `jsonb`: el modelo la cifra en reposo (cast `encrypted:array`), así que
            // la DB nunca la ve en claro ni se filtra/ordena por su contenido.
            $table->text('data');

            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->cascadeOnDelete();
            $table->foreign('branch_id')->references('id')->on('branches')->nullOnDelete();
            $table->foreign('client_id')->references('id')->on('clients')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();

            // Una historia viva por paciente (se edita, no se versiona por folios como en odontología).
            $table->unique('client_id');
            $table->index(['business_id', 'client_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinical_intakes');
    }
};
