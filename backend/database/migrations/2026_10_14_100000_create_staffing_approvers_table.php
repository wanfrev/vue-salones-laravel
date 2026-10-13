<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Named approvers for the payroll approval stamp (feature `staffing_approval_stamp`).
 *
 * Why not "the logged-in user": the agency's few bosses all share ONE admin login, so the account
 * that approves a week says nothing about which boss did it. Instead each boss is registered here
 * with a PIN and a drawn signature, and approving a week asks "who are you?" + their PIN.
 *
 * - `staffing_approvers`: name, hashed PIN, drawn signature (PNG data URL).
 * - `staffing_timesheets.approved_by_name`: the approver's name frozen at approval, so renaming or
 *   deleting an approver later never rewrites history (the signature image is already frozen in
 *   `approval_signature`, added by 2026_10_13_100000).
 * Replaces the per-user `staffing_signatures` table of 2026_10_13_100000, which only made sense with
 * one login per person — dropped here if present.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('staffing_approvers')) {
            Schema::create('staffing_approvers', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('business_id');
                $table->string('name', 80);
                $table->string('pin_hash');
                $table->text('image')->nullable();
                $table->boolean('active')->default(true);
                $table->timestamps();

                $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
                $table->index(['business_id', 'active'], 'idx_staffing_approvers_business_active');
            });
        }

        if (!Schema::hasColumn('staffing_timesheets', 'approved_by_name')) {
            Schema::table('staffing_timesheets', function (Blueprint $table) {
                $table->string('approved_by_name', 80)->nullable();
            });
        }

        Schema::dropIfExists('staffing_signatures');
    }

    public function down(): void
    {
        if (Schema::hasColumn('staffing_timesheets', 'approved_by_name')) {
            Schema::table('staffing_timesheets', function (Blueprint $table) {
                $table->dropColumn('approved_by_name');
            });
        }

        Schema::dropIfExists('staffing_approvers');
    }
};
