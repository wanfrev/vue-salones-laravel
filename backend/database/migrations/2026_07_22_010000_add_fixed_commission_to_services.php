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
        Schema::table('services', function (Blueprint $table) {
            $table->boolean('is_fixed_commission')->default(false);
            $table->decimal('fixed_commission_amount', 10, 2)->default(0)->nullable();
            $table->decimal('fixed_commission_assistant_amount', 10, 2)->default(0)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn([
                'is_fixed_commission',
                'fixed_commission_amount',
                'fixed_commission_assistant_amount'
            ]);
        });
    }
};
