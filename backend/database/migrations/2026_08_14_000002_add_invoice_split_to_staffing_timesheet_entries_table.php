<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * StaffingPayrollCalculator::invoice() already computes InvoiceLine::$regularAmount and
 * $overtimeAmount (each rounded to the cent, the way the CWT sheet does) but only their sum was
 * persisted as `invoice_total`. Printing a real REG AMOUNT / OT AMOUNT split on the invoice
 * (see staffingInvoicePrint.ts) needs both numbers stored, not re-derived client-side from
 * `bill_rate * hours` — that recomputation drops the overtime bill rate's own rounding.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('staffing_timesheet_entries', 'invoice_regular_amount')) {
            return;
        }

        Schema::table('staffing_timesheet_entries', function (Blueprint $table) {
            $table->decimal('invoice_regular_amount', 15, 2)->nullable()->after('invoice_total');
            $table->decimal('invoice_overtime_amount', 15, 2)->nullable()->after('invoice_regular_amount');
        });
    }

    public function down(): void
    {
        Schema::table('staffing_timesheet_entries', function (Blueprint $table) {
            $table->dropColumn(['invoice_regular_amount', 'invoice_overtime_amount']);
        });
    }
};
