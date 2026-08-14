<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One employee x tax-entity x year cell of the annual taxes report: a dollar amount and an
 * optional uploaded document. `file_path` is on the PRIVATE local disk (not `public`) — these
 * documents are tied to an SSN, so they're served through an authenticated download route
 * (StaffingTaxEntryController::download) rather than a guessable public URL.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('staffing_tax_entries')) {
            return;
        }

        Schema::create('staffing_tax_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('employee_id');
            $table->uuid('tax_entity_id');

            $table->unsignedSmallInteger('year');
            $table->decimal('amount', 15, 2)->default(0);
            $table->string('file_path')->nullable();
            $table->string('file_original_name')->nullable();
            $table->date('entry_date')->nullable();
            $table->uuid('created_by')->nullable();

            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
            $table->foreign('employee_id')->references('id')->on('profiles');
            $table->foreign('tax_entity_id')->references('id')->on('staffing_tax_entities')->onDelete('cascade');

            $table->unique(['employee_id', 'tax_entity_id', 'year'], 'unique_staffing_tax_entry_employee_entity_year');
            $table->index(['business_id', 'year'], 'idx_staffing_tax_entries_biz_year');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staffing_tax_entries');
    }
};
