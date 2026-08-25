<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_attributes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->string('name');
            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
            $table->unique(['business_id', 'name']);
        });

        Schema::create('product_attribute_values', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('attribute_id');
            $table->string('value');
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('attribute_id')->references('id')->on('product_attributes')->onDelete('cascade');
            $table->unique(['attribute_id', 'value']);
        });

        Schema::create('product_variant_attribute_values', function (Blueprint $table) {
            $table->uuid('variant_id');
            $table->uuid('attribute_value_id');
            $table->timestamps();

            $table->foreign('variant_id')->references('id')->on('product_variants')->onDelete('cascade');
            $table->foreign('attribute_value_id')->references('id')->on('product_attribute_values')->onDelete('cascade');
            $table->primary(['variant_id', 'attribute_value_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variant_attribute_values');
        Schema::dropIfExists('product_attribute_values');
        Schema::dropIfExists('product_attributes');
    }
};
