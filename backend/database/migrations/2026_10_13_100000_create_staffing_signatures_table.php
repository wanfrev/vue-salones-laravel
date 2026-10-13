<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Opt-in drawn signature for the payroll approval stamp (feature `staffing_approval_stamp`).
 * - `staffing_signatures`: each approver draws theirs once. A separate table so the shared
 *   `profiles` table (used by every niche) stays untouched.
 * - `staffing_timesheets.approval_signature`: a frozen copy taken at approval, so changing your
 *   signature later never rewrites an already-approved week.
 * Everything nullable / only written when the business has the feature on.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('staffing_signatures')) {
            Schema::create('staffing_signatures', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('business_id');
                $table->uuid('profile_id');
                $table->text('image');
                $table->timestamps();

                $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
                $table->foreign('profile_id')->references('id')->on('profiles')->onDelete('cascade');
                $table->unique('profile_id', 'unique_staffing_signature_profile');
            });
        }

        if (!Schema::hasColumn('staffing_timesheets', 'approval_signature')) {
            Schema::table('staffing_timesheets', function (Blueprint $table) {
                $table->text('approval_signature')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('staffing_timesheets', 'approval_signature')) {
            Schema::table('staffing_timesheets', function (Blueprint $table) {
                $table->dropColumn('approval_signature');
            });
        }

        Schema::dropIfExists('staffing_signatures');
    }
};
