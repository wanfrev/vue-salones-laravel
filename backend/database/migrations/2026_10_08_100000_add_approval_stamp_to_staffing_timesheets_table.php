<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Opt-in "sello de aprobación" (feature `staffing_approval_stamp`): who approved a week, when, and
 * a verification code derived from that week's numbers (see App\Services\Staffing\ApprovalStamp).
 * All nullable and only written when the business has the feature on, so existing weeks and
 * businesses that never enable it are untouched.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('staffing_timesheets', 'approval_code')) {
            return;
        }

        Schema::table('staffing_timesheets', function (Blueprint $table) {
            $table->uuid('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->string('approval_code', 20)->nullable();

            $table->foreign('approved_by')->references('id')->on('users')->onDelete('set null');
            $table->index(['business_id', 'approval_code'], 'idx_staffing_timesheets_approval_code');
        });
    }

    public function down(): void
    {
        Schema::table('staffing_timesheets', function (Blueprint $table) {
            $table->dropIndex('idx_staffing_timesheets_approval_code');
            $table->dropForeign(['approved_by']);
            $table->dropColumn(['approved_by', 'approved_at', 'approval_code']);
        });
    }
};
