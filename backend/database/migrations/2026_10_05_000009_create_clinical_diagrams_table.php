<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Genograma y línea de vida. Uno vivo por (paciente|caso, tipo): se edita, no se versiona.
        Schema::create('clinical_diagrams', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('branch_id')->nullable();
            // Exactamente uno de los dos: de un paciente (individual) o de un caso (familia/pareja).
            $table->uuid('client_id')->nullable();
            $table->uuid('case_id')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();

            $table->string('type', 12); // genogram | life_line
            // Nodos, vínculos y posiciones / eventos — cifrado en reposo (modelo: encrypted:array).
            $table->text('data');

            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->cascadeOnDelete();
            $table->foreign('branch_id')->references('id')->on('branches')->nullOnDelete();
            $table->foreign('client_id')->references('id')->on('clients')->cascadeOnDelete();
            // Sin FK a clinical_cases por la misma razón que las notas conjuntas (ver migración 000007).

            $table->unique(['client_id', 'type']);
            $table->unique(['case_id', 'type']);
            $table->index(['business_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinical_diagrams');
    }
};
