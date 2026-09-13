<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dental_charts', function (Blueprint $table) {
            // Sibling to `teeth` (condition per face) — ICDAS severity (caries) and G.V. Black
            // classification (restorations), kept separate so existing `teeth` rows never change
            // shape: { [tooth]: { [face]: { icdas?: int, black?: string } } }.
            $table->jsonb('codes')->default('{}')->after('teeth');
        });
    }

    public function down(): void
    {
        Schema::table('dental_charts', function (Blueprint $table) {
            $table->dropColumn('codes');
        });
    }
};
