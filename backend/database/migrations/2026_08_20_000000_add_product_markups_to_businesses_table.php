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
        Schema::table('businesses', function (Blueprint $table) {
            $table->decimal('product_price1_markup', 8, 2)->default(50.00)->after('niche_type');
            $table->decimal('product_price2_markup', 8, 2)->default(70.00)->after('product_price1_markup');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('businesses', function (Blueprint $table) {
            $table->dropColumn(['product_price1_markup', 'product_price2_markup']);
        });
    }
};
