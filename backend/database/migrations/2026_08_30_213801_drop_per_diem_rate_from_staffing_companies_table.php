<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Per diem is now a manually-entered total per timesheet entry, not days × a company rate. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staffing_companies', function (Blueprint $table) {
            if (Schema::hasColumn('staffing_companies', 'per_diem_rate')) {
                $table->dropColumn('per_diem_rate');
            }
        });
    }

    public function down(): void
    {
        Schema::table('staffing_companies', function (Blueprint $table) {
            $table->decimal('per_diem_rate', 10, 2)->default(0)->after('agency_overhead_rate');
        });
    }
};
