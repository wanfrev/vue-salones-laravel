<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The rate card: for a given company and job role, what the worker earns per hour and what the
 * client is billed for that same hour. The gap between the two is the agency's margin.
 *
 * `role` is free text matched against businesses.job_titles (the jsonb list the employee form
 * already maintains) — no separate roles table, on purpose.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('staffing_company_rates')) {
            return;
        }

        Schema::create('staffing_company_rates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('company_id');

            $table->string('role');
            // What the employee earns.
            $table->decimal('pay_rate', 15, 2)->default(0);
            // What the client is charged. The sheets call this column COMPANY.
            $table->decimal('bill_rate', 15, 2)->default(0);

            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
            $table->foreign('company_id')->references('id')->on('staffing_companies')->onDelete('cascade');

            // One rate per role per company — the resolution for an employee must be unambiguous.
            $table->unique(['company_id', 'role'], 'unique_staffing_rate_company_role');
            $table->index(['business_id', 'company_id'], 'idx_staffing_rates_biz_company');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staffing_company_rates');
    }
};
