<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('requirements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->string('name');
            $table->string('recommended_quantity');
            $table->string('recommended_brands')->nullable();
            $table->decimal('guide_price', 12, 2)->nullable();
            $table->string('status')->default('pending'); // pending, purchased, cancelled
            $table->uuid('created_by_profile_id')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('business_id')->references('id')->on('businesses')->cascadeOnDelete();
            $table->foreign('created_by_profile_id')->references('id')->on('profiles')->nullOnDelete();
            
            $table->index(['business_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('requirements');
    }
};
