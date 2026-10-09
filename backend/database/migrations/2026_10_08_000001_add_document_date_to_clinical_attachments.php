<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Fecha del documento (cuándo se hizo la prueba / se emitió el informe), distinta de cuándo se
        // subió: es lo que permite ordenar un expediente cronológicamente. Solo toca una tabla clínica.
        Schema::table('clinical_attachments', function (Blueprint $table) {
            $table->date('document_date')->nullable()->after('title');
        });
    }

    public function down(): void
    {
        Schema::table('clinical_attachments', function (Blueprint $table) {
            $table->dropColumn('document_date');
        });
    }
};
