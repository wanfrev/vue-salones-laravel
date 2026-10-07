<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clinical_treatment_plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('branch_id')->nullable();
            $table->uuid('client_id');
            $table->uuid('created_by')->nullable();

            // active | paused | completed — sin cifrar para poder listar/filtrar por estado.
            $table->string('status', 20)->default('active');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();

            // {approach, formulation, frequency, goals:[{id,text,status}], notes} — cifrado en reposo.
            $table->text('data');

            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->cascadeOnDelete();
            $table->foreign('branch_id')->references('id')->on('branches')->nullOnDelete();
            $table->foreign('client_id')->references('id')->on('clients')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['business_id', 'client_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinical_treatment_plans');
    }
};
