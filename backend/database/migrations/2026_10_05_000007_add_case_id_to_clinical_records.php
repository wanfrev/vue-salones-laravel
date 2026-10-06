<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Notas y planes CONJUNTOS cuelgan de un caso (case_id) y, por compatibilidad con el resto del
     * módulo, también llevan client_id = titular del caso. Lo individual es siempre case_id NULL.
     *
     * Sin FK a clinical_cases A PROPÓSITO: un ON DELETE CASCADE destruiría el registro clínico y un
     * SET NULL convertiría una nota conjunta en una individual del titular (fuga de privacidad).
     * La aplicación nunca borra casos (solo los cierra), y borrar el negocio ya cascadea todo.
     */
    public function up(): void
    {
        Schema::table('clinical_session_notes', function (Blueprint $table) {
            $table->uuid('case_id')->nullable()->after('appointment_id');
            $table->index(['business_id', 'case_id', 'session_date']);
        });

        Schema::table('clinical_treatment_plans', function (Blueprint $table) {
            $table->uuid('case_id')->nullable()->after('client_id');
            $table->index(['business_id', 'case_id']);
        });

        // Bitácora: los eventos de un caso se anotan con client_id = titular y además case_id.
        Schema::table('clinical_access_logs', function (Blueprint $table) {
            $table->uuid('case_id')->nullable()->after('client_id');
        });
    }

    public function down(): void
    {
        Schema::table('clinical_access_logs', fn (Blueprint $t) => $t->dropColumn('case_id'));
        Schema::table('clinical_treatment_plans', function (Blueprint $t) {
            $t->dropIndex(['business_id', 'case_id']);
            $t->dropColumn('case_id');
        });
        Schema::table('clinical_session_notes', function (Blueprint $t) {
            $t->dropIndex(['business_id', 'case_id', 'session_date']);
            $t->dropColumn('case_id');
        });
    }
};
