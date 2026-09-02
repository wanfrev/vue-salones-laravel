<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The multi-file fields on an incident (Facturas, Paperwork, Drug Test, Fotos) — one row per
 * uploaded file, discriminated by `file_type`, same "child table with a FK" shape as
 * employee_documents rather than a polymorphic attachable_type/attachable_id (no other table in
 * this codebase uses that pattern, so it's not introduced here either).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staffing_incident_files', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('incident_id');
            $table->string('file_type'); // 'factura' | 'paperwork' | 'drug_test' | 'foto'
            $table->string('file_path');
            $table->string('file_original_name');
            $table->uuid('uploaded_by')->nullable();
            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
            $table->foreign('incident_id')->references('id')->on('staffing_incidents')->onDelete('cascade');
            $table->foreign('uploaded_by')->references('id')->on('profiles')->onDelete('set null');

            $table->index(['incident_id', 'file_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staffing_incident_files');
    }
};
