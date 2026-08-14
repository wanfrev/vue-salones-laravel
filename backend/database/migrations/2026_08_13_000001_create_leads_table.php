<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The staffing CRM: a sales rep's ("vendedora") own prospect list. `owner_id` is who registered
 * the lead and, per the business rule, the only non-admin who may see or edit it — LeadService
 * enforces that, this table just stores the fact. Distinct from `staffing_companies` (a company
 * already under contract, invoiced weekly) — a lead is pre-sales, before there's a rate card.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('leads')) {
            return;
        }

        Schema::create('leads', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('owner_id');

            $table->string('company_name');
            $table->string('work_area')->nullable();
            $table->string('address')->nullable();
            $table->string('phone')->nullable();

            // 'new' | 'called' | 'answered' | 'emailed' | 'meeting' | 'won' | 'lost'
            $table->string('status')->default('new');
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
            $table->foreign('owner_id')->references('id')->on('profiles')->onDelete('cascade');

            $table->index(['business_id', 'owner_id'], 'idx_leads_biz_owner');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
