<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Workplace incident tracking for the staffing niche — one row per incident (an injury, a
 * complaint, anything that needs a paper trail). Single-file fields (reporte, relief_form) live
 * as flat columns here, same pattern as staffing_tax_entries; fields that can carry several files
 * (facturas, paperwork, drug test, fotos) live in the child table staffing_incident_files.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staffing_incidents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('branch_id')->nullable();
            $table->uuid('employee_id');
            $table->uuid('company_id')->nullable();
            $table->text('comments')->nullable();
            $table->date('incident_date');
            $table->date('follow_up_date')->nullable();
            $table->boolean('wants_urgent_care')->nullable();
            $table->string('status')->default('activo');
            $table->string('drug_test_result')->nullable();
            $table->string('reporte_file_path')->nullable();
            $table->string('reporte_file_original_name')->nullable();
            $table->string('relief_form_file_path')->nullable();
            $table->string('relief_form_file_original_name')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
            $table->foreign('branch_id')->references('id')->on('branches')->onDelete('set null');
            $table->foreign('employee_id')->references('id')->on('profiles')->onDelete('cascade');
            $table->foreign('company_id')->references('id')->on('staffing_companies')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('profiles')->onDelete('set null');

            $table->index(['business_id', 'incident_date']);
            $table->index(['business_id', 'company_id']);
            $table->index(['business_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staffing_incidents');
    }
};
