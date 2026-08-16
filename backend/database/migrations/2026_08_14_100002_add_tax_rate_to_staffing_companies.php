<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staffing_companies', function (Blueprint $table) {
            $table->decimal('tax_rate', 8, 4)->default(0.0400);
        });
    }

    public function down(): void
    {
        Schema::table('staffing_companies', function (Blueprint $table) {
            $table->dropColumn('tax_rate');
        });
    }
};
