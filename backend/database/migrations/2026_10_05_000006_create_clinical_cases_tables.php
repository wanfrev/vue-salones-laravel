<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Caso = unidad de tratamiento conjunta (pareja, familia o grupo). En terapia sistémica el
        // paciente es el sistema: las notas y el plan conjuntos pertenecen al caso, no a un integrante.
        Schema::create('clinical_cases', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('branch_id')->nullable();
            $table->uuid('created_by')->nullable();

            $table->string('type', 10);            // couple | family | group
            $table->string('name', 150);
            $table->string('status', 10)->default('active'); // active | closed
            $table->date('opened_on')->nullable();
            $table->date('closed_on')->nullable();

            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->cascadeOnDelete();
            $table->foreign('branch_id')->references('id')->on('branches')->nullOnDelete();

            $table->index(['business_id', 'status']);
        });

        Schema::create('clinical_case_members', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('case_id');
            $table->uuid('client_id');

            $table->string('role', 60)->nullable();      // "madre", "pareja", "paciente identificado"...
            $table->boolean('is_primary')->default(false); // titular: el que aparece en la agenda y se cobra
            $table->date('joined_on')->nullable();
            // Sin borrar la fila al salir: quien participó sigue viendo las sesiones conjuntas
            // en las que estuvo; left_on solo indica que ya no es integrante activo.
            $table->date('left_on')->nullable();

            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->cascadeOnDelete();
            $table->foreign('case_id')->references('id')->on('clinical_cases')->cascadeOnDelete();
            $table->foreign('client_id')->references('id')->on('clients')->cascadeOnDelete();

            $table->unique(['case_id', 'client_id']);
            $table->index(['business_id', 'client_id']);
        });

        // Vínculo cita → caso en tabla propia a propósito: las citas se crean por varios caminos
        // compartidos con todos los nichos (formulario, agendaService, reserva pública) y no se
        // tocan; el vínculo lo hace el módulo clínico desde el detalle de la cita.
        Schema::create('clinical_case_appointments', function (Blueprint $table) {
            $table->uuid('appointment_id')->primary(); // una cita pertenece a lo sumo a un caso
            $table->uuid('business_id');
            $table->uuid('case_id');
            $table->uuid('linked_by')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->foreign('business_id')->references('id')->on('businesses')->cascadeOnDelete();
            $table->foreign('case_id')->references('id')->on('clinical_cases')->cascadeOnDelete();
            $table->foreign('appointment_id')->references('id')->on('appointments')->cascadeOnDelete();

            $table->index(['business_id', 'case_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinical_case_appointments');
        Schema::dropIfExists('clinical_case_members');
        Schema::dropIfExists('clinical_cases');
    }
};
