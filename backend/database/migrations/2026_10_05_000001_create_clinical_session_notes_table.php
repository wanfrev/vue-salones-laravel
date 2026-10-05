<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clinical_session_notes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('branch_id')->nullable();
            $table->uuid('client_id');
            // Cita de la agenda a la que corresponde la sesión (opcional: una nota puede
            // escribirse sin cita, p. ej. una llamada de seguimiento).
            $table->uuid('appointment_id')->nullable();
            $table->uuid('created_by')->nullable();

            $table->unsignedInteger('session_number');
            $table->date('session_date');
            $table->unsignedSmallInteger('duration_minutes')->nullable();
            // none | low | moderate | high — en columna propia (sin cifrar) para poder alertar
            // en listados sin descifrar el cuerpo de la nota.
            $table->string('risk_level', 20)->default('none');
            $table->unsignedTinyInteger('mood_rating')->nullable(); // 1-10, ánimo reportado

            // Cuerpo SOAP {subjective, objective, assessment, plan} y tareas — cifrados en reposo.
            $table->text('content');
            $table->text('tasks')->nullable();

            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->cascadeOnDelete();
            $table->foreign('branch_id')->references('id')->on('branches')->nullOnDelete();
            $table->foreign('client_id')->references('id')->on('clients')->cascadeOnDelete();
            $table->foreign('appointment_id')->references('id')->on('appointments')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['business_id', 'client_id', 'session_date']);
            $table->index('appointment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinical_session_notes');
    }
};
