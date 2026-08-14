<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The configurable $-columns of the annual taxes report (the client's sheet had columns like
 * COSMOS/INTEGRITY/ATLANTA whose exact meaning wasn't confirmed) — deliberately an open,
 * business-managed list rather than hardcoded names, so the real entities can be named later
 * without a migration.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('staffing_tax_entities')) {
            return;
        }

        Schema::create('staffing_tax_entities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->string('name');
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
            $table->unique(['business_id', 'name'], 'unique_staffing_tax_entity_biz_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staffing_tax_entities');
    }
};
