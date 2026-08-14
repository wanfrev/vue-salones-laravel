<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `2026_08_14_100001_remove_payroll_rules_from_staffing_companies` dropped this column along
 * with the two OT columns it was bundled with, but nothing replaced it: StaffingInvoiceService
 * still reads `payment_terms_days` for the invoice due date, and it always fell back to the
 * hardcoded 15-day default from then on, silently ignoring whatever a client's real payment
 * terms were. The OT columns stay retired (that part of the move was correct — OT terms live
 * per-role now), only this one comes back.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('staffing_companies', 'payment_terms_days')) {
            return;
        }

        Schema::table('staffing_companies', function (Blueprint $table) {
            $table->unsignedSmallInteger('payment_terms_days')->default(15)->after('work_site');
        });
    }

    public function down(): void
    {
        Schema::table('staffing_companies', function (Blueprint $table) {
            $table->dropColumn('payment_terms_days');
        });
    }
};
