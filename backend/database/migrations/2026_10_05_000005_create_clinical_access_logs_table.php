<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clinical_access_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            // Sin FK a clients/users a propósito: la bitácora debe sobrevivir al borrado del
            // paciente o del usuario (el listado muestra "eliminado" si el join ya no resuelve).
            $table->uuid('client_id');
            $table->uuid('user_id')->nullable();

            // viewed | created | updated | report_printed
            $table->string('action', 20);
            // intake | session_note | treatment_plan | consent | assessment | report
            $table->string('resource', 30);
            $table->uuid('resource_id')->nullable();
            $table->string('detail', 100)->nullable(); // p. ej. tipo de informe impreso
            $table->string('ip', 45)->nullable();

            // Solo created_at: la bitácora es de solo-anexar, nunca se actualiza.
            $table->timestamp('created_at');

            $table->foreign('business_id')->references('id')->on('businesses')->cascadeOnDelete();

            $table->index(['business_id', 'created_at']);
            $table->index(['business_id', 'client_id', 'created_at']);
            $table->index(['business_id', 'user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinical_access_logs');
    }
};
