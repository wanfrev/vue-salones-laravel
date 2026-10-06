<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clinical_attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('branch_id')->nullable();
            $table->uuid('client_id');
            $table->uuid('uploaded_by')->nullable();

            // test_result | external_report | patient_material | other
            $table->string('category', 20);
            // Título y nombre original cifrados (el nombre de un archivo suele delatar al paciente
            // o el diagnóstico: "resultados_ana_perez.pdf"), de ahí `text`.
            $table->text('title');
            $table->text('original_name');
            $table->string('mime', 100);
            $table->unsignedBigInteger('size'); // bytes del archivo original (antes de cifrar)
            // Ruta en el disco privado; el contenido está cifrado, no se sirve nunca directo.
            $table->string('path', 255);

            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->cascadeOnDelete();
            $table->foreign('branch_id')->references('id')->on('branches')->nullOnDelete();
            $table->foreign('client_id')->references('id')->on('clients')->cascadeOnDelete();

            $table->index(['business_id', 'client_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinical_attachments');
    }
};
