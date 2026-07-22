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
            $table->uuid('linked_product_id')->nullable();
            $table->uuid('linked_variant_id')->nullable();

            // Foreign keys
            $table->foreign('linked_product_id')->references('id')->on('products')->nullOnDelete();
            $table->foreign('linked_variant_id')->references('id')->on('product_variants')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropForeign(['linked_product_id']);
            $table->dropForeign(['linked_variant_id']);
            $table->dropColumn(['linked_product_id', 'linked_variant_id']);
        });
    }
};
