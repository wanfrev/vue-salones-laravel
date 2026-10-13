<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Named approvers for the payroll approval stamp (feature `staffing_approval_stamp`).
 *
 * Why not "the logged-in user": the agency's few bosses all share ONE admin login, so the account
 * that approves a week says nothing about which boss did it. Instead each boss is registered here
 * with a name and a PIN, and approving a week asks "who are you?" + their PIN.
 *
 * - `staffing_approvers`: name + hashed PIN.
 * - `staffing_timesheets.approved_by_name`: the approver's name frozen at approval, so renaming or
 *   deleting an approver later never rewrites history.
 * Also removes what an earlier iteration of this feature added in 2026_10_13_100000 and nothing
 * uses any more: the per-user `staffing_signatures` table and the drawn-signature column
 * `staffing_timesheets.approval_signature` (identification is name + PIN only, no drawn signature).
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

        if (Schema::hasColumn('staffing_timesheets', 'approval_signature')) {
            Schema::table('staffing_timesheets', function (Blueprint $table) {
                $table->dropColumn('approval_signature');
            });
        }
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
