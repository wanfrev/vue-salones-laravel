<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staffing_companies', function (Blueprint $table) {
            $table->dropColumn([
                'payment_terms_days',
                'overtime_threshold_hours',
                'overtime_multiplier',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('staffing_companies', function (Blueprint $table) {
            $table->unsignedSmallInteger('payment_terms_days')->default(15);
            $table->decimal('overtime_threshold_hours', 8, 2)->default(40);
            $table->decimal('overtime_multiplier', 8, 2)->default(1.5);
        });
    }
};
