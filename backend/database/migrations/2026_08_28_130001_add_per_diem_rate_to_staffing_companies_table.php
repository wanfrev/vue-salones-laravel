<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Optional flat per-day per diem the company pays its staffed employees — not billed on the invoice. */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('staffing_companies', 'per_diem_rate')) {
            return;
        }

        Schema::table('staffing_companies', function (Blueprint $table) {
            $table->decimal('per_diem_rate', 10, 2)->default(0)->after('agency_overhead_rate');
        });
    }

    public function down(): void
    {
        Schema::table('staffing_companies', function (Blueprint $table) {
            $table->dropColumn('per_diem_rate');
        });
    }
};
