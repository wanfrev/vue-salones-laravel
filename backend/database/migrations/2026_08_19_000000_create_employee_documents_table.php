<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Scanned documents attached to an employee's profile — ID, work letters, contracts, etc. Any
 * niche, unlike employee_assets/employee_documents' staffing-only siblings. The file itself lives
 * on the private `local` disk (never a public URL — see StaffingTaxEntryService for the same
 * pattern), only its path and original filename are stored here.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('employee_documents')) {
            return;
        }

        Schema::create('employee_documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('employee_id');

            // Free-text label the admin types in, e.g. "Cédula", "Carta de trabajo" — not an
            // enum, since every business's own paperwork differs.
            $table->string('label')->nullable();
            $table->string('file_path');
            $table->string('file_original_name');
            $table->uuid('uploaded_by')->nullable();

            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
            $table->foreign('employee_id')->references('id')->on('profiles')->onDelete('cascade');
            $table->index('business_id');
            $table->index('employee_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_documents');
    }
};
