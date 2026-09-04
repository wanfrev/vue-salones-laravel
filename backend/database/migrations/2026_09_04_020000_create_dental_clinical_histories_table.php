<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dental_clinical_histories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('branch_id')->nullable();
            $table->uuid('client_id');
            $table->unsignedInteger('folio_number');
            $table->uuid('created_by')->nullable();

            // Sección A del formato SmilePUJ.
            $table->jsonb('anamnesis')->default('{}');
            // Sección B.
            $table->jsonb('examen_fisico')->default('{}');
            // Sección C.
            $table->jsonb('examenes_complementarios')->default('{}');
            // Sección D.
            $table->jsonb('diagnostico')->default('{}');
            // Sección E.
            $table->boolean('certificado_veracidad')->default(false);
            $table->text('observaciones_generales')->nullable();

            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->cascadeOnDelete();
            $table->foreign('branch_id')->references('id')->on('branches')->nullOnDelete();
            $table->foreign('client_id')->references('id')->on('clients')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();

            $table->unique(['client_id', 'folio_number']);
            $table->index(['business_id', 'client_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dental_clinical_histories');
    }
};
