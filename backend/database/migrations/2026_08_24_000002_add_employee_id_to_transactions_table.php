<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lets a transaction be attributed directly to an employee with no appointment at all —
 * needed for a standalone tip given at POS with no service attached (see PosService::
 * recordStandaloneTip). Every other employee-attribution path in the app goes through
 * appointments.employee_id; this is the one exception, so it stays nullable and unused by
 * every existing transaction (appointment-linked sales keep attributing through the
 * appointment, not this column).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->uuid('employee_id')->nullable()->after('appointment_id');
            $table->foreign('employee_id')->references('id')->on('profiles')->onDelete('set null');
            $table->index('employee_id');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['employee_id']);
            $table->dropColumn('employee_id');
        });
    }
};
