<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * A third, manual state alongside the `active` boolean: a client company can be "on hold"
 * (on_hold) — still a real client, just with no crew assigned this season, distinct from
 * "inactive" (no longer a client at all). `active` is kept and mirrored by StaffingCompany's
 * saving() hook so every existing `where('active', ...)` call site keeps working unchanged.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('staffing_companies', 'status')) {
            return;
        }

        Schema::table('staffing_companies', function (Blueprint $table) {
            $table->string('status')->default('active')->after('active');
        });

        DB::table('staffing_companies')->update([
            'status' => DB::raw("CASE WHEN active THEN 'active' ELSE 'inactive' END"),
        ]);

        Schema::table('staffing_companies', function (Blueprint $table) {
            $table->index(['business_id', 'status'], 'idx_staffing_companies_biz_status');
        });
    }

    public function down(): void
    {
        Schema::table('staffing_companies', function (Blueprint $table) {
            $table->dropIndex('idx_staffing_companies_biz_status');
            $table->dropColumn('status');
        });
    }
};
