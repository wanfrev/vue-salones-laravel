<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->boolean('is_fixed_commission_override')->default(false)->nullable();
            $table->decimal('employee_amount_override', 10, 2)->nullable();
            $table->decimal('assistant_amount_override', 10, 2)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn([
                'is_fixed_commission_override',
                'employee_amount_override',
                'assistant_amount_override'
            ]);
        });
    }
};
