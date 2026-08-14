<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SSN follows the exact pattern already used for bank_account_number/payroll_card_number:
 * encrypted at rest, hidden from the default JSON response, with a *_last4 accessor exposed
 * instead. `address` is new to Profile entirely — StaffingCompany already has one, employees
 * didn't, and the staffing taxes report needs it.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('profiles', 'ssn')) {
            return;
        }

        Schema::table('profiles', function (Blueprint $table) {
            $table->text('ssn')->nullable()->after('staffing_tax_rate');
            $table->string('address')->nullable()->after('ssn');
        });
    }

    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->dropColumn(['ssn', 'address']);
        });
    }
};
