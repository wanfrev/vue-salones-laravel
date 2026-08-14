<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staffing_companies', function (Blueprint $table) {
            $table->dropColumn(['tax_brackets', 'tax_destination']);
        });
    }

    public function down(): void
    {
        Schema::table('staffing_companies', function (Blueprint $table) {
            $table->jsonb('tax_brackets')->nullable();
            $table->string('tax_destination')->default('remitted');
        });
    }
};
