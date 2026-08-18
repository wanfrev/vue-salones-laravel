<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The shift half of an assignment — mirrors `role`: fixed until the admin reassigns it, not
 * something chosen per timesheet week. Lets StaffingRateService::resolveFor() pick the right
 * (company, role, shift) rate row for a company that splits a role's pay by shift.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('staffing_company_employees', 'shift')) {
            return;
        }

        Schema::table('staffing_company_employees', function (Blueprint $table) {
            // 'dia' | 'tarde' | 'noche' | null
            $table->string('shift')->nullable()->after('role');
        });
    }

    public function down(): void
    {
        Schema::table('staffing_company_employees', function (Blueprint $table) {
            $table->dropColumn('shift');
        });
    }
};
