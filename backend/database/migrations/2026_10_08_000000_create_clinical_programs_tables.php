<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Programa = paquete de sesiones que se cobra junto (ej. "8 sesiones al mes"). Catálogo del negocio.
        // `components` = [{service_ids: [uuid...], quantity: n}]: cada componente son n sesiones que pueden
        // ser de cualquiera de esos servicios (el programa mixto: 12 a elegir entre varios + 1 asesoría).
        Schema::create('clinical_programs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('created_by')->nullable();

            $table->string('name', 120);
            $table->decimal('price', 10, 2);                  // USD, como el resto del catálogo
            $table->unsignedSmallInteger('validity_days')->default(30);
            $table->json('components');
            $table->boolean('active')->default(true);

            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->cascadeOnDelete();
            $table->index(['business_id', 'active']);
        });

        // Inscripción = un paciente en un programa. Guarda el nombre y el precio de ese momento: editar
        // el catálogo después no cambia lo que ya se vendió.
        Schema::create('clinical_program_enrollments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('branch_id')->nullable();
            $table->uuid('program_id')->nullable();            // sin FK a propósito: un programa archivado/borrado no toca lo vendido
            $table->uuid('client_id');
            $table->uuid('created_by')->nullable();

            $table->string('program_name', 120);
            $table->decimal('price', 10, 2);
            $table->unsignedSmallInteger('sessions_total');
            $table->date('starts_on');
            $table->date('expires_on');                         // pasada esta fecha, las sesiones sin usar se pierden (se puede extender)
            $table->string('status', 10)->default('active');    // active | cancelled (completada/vencida se deducen)

            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->cascadeOnDelete();
            $table->foreign('client_id')->references('id')->on('clients')->cascadeOnDelete();

            $table->index(['business_id', 'client_id']);
            $table->index(['business_id', 'status']);
        });

        // Vínculo sesión → cita en tabla propia (igual que los casos): el flujo compartido de citas no se toca.
        Schema::create('clinical_program_sessions', function (Blueprint $table) {
            $table->uuid('appointment_id')->primary();          // una cita pertenece a lo sumo a una inscripción
            $table->uuid('business_id');
            $table->uuid('enrollment_id');
            $table->unsignedSmallInteger('position');
            // null = se deduce del estado de la cita (realizada o inasistencia consumen; cancelada no).
            // true/false = decisión manual de quien administra para esa sesión.
            $table->boolean('consumes')->nullable();

            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->cascadeOnDelete();
            $table->foreign('enrollment_id')->references('id')->on('clinical_program_enrollments')->cascadeOnDelete();
            $table->foreign('appointment_id')->references('id')->on('appointments')->cascadeOnDelete();

            $table->index('enrollment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinical_program_sessions');
        Schema::dropIfExists('clinical_program_enrollments');
        Schema::dropIfExists('clinical_programs');
    }
};
