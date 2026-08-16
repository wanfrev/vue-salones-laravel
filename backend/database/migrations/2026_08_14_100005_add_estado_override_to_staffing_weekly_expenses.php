<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lets the admin override the weekly report's auto-computed invoice status (paid/pending/
 * no_invoice) per (company, week) — the PDF asks for "estado" to be both auto-filled and
 * editable, same as "otros gastos" already is. Null keeps the automatic value.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staffing_weekly_expenses', function (Blueprint $table) {
            $table->string('estado_override', 20)->nullable()->after('amount');
        });
    }

    public function down(): void
    {
        Schema::table('staffing_weekly_expenses', function (Blueprint $table) {
            $table->dropColumn('estado_override');
        });
    }
};
