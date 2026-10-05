<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clinical_assessments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('branch_id')->nullable();
            $table->uuid('client_id');
            $table->uuid('created_by')->nullable();

            $table->string('instrument', 20); // phq9 | gad7
            $table->json('answers');           // un entero 0-3 por ítem
            $table->unsignedSmallInteger('total_score');
            $table->string('severity', 30);
            // true si el ítem de ideación suicida (PHQ-9 #9) fue > 0 — se muestra como alerta.
            $table->boolean('risk_flag')->default(false);
            $table->text('notes')->nullable();
            $table->timestamp('assessed_at');

            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->cascadeOnDelete();
            $table->foreign('branch_id')->references('id')->on('branches')->nullOnDelete();
            $table->foreign('client_id')->references('id')->on('clients')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['business_id', 'client_id', 'instrument', 'assessed_at'], 'clinical_assessments_lookup_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinical_assessments');
    }
};
