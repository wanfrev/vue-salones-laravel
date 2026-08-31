<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Splits "active" from a single global profiles.active into a per-assignment flag: pausing a
 * worker at one client company must not hide them from every other company they're placed at.
 * profiles.active is left untouched — it still means "no longer works for the agency at all".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staffing_company_employees', function (Blueprint $table) {
            $table->boolean('active')->default(true)->after('shift');
        });
    }

    public function down(): void
    {
        Schema::table('staffing_company_employees', function (Blueprint $table) {
            $table->dropColumn('active');
        });
    }
};
