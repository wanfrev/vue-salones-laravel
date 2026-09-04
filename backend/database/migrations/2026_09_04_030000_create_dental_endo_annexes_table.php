<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dental_endo_annexes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('branch_id')->nullable();
            $table->uuid('client_id');
            $table->unsignedSmallInteger('tooth_number');
            $table->uuid('created_by')->nullable();

            // Historia de dolor + examen clínico + pruebas periapicales/sensibilidad + examen
            // radiográfico + clasificación de fisuras + historia de trauma (secciones A-G del PDF).
            $table->jsonb('examen')->default('{}');
            // Diagnóstico y pronóstico (secciones H-I).
            $table->jsonb('diagnostico')->default('{}');
            // Tratamiento de endodoncia, incluyendo la lista de conductos (sección J).
            $table->jsonb('tratamiento')->default('{}');

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
        Schema::dropIfExists('dental_endo_annexes');
    }
};
