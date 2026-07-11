<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropForeign('services_service_category_id_fkey');
            $table->dropColumn('service_category_id');
        });

        Schema::dropIfExists('service_categories');
    }

    public function down(): void
    {
        Schema::create('service_categories', function (Blueprint $table) {
            $table->uuid('id')->default(DB::raw('gen_random_uuid()'))->primary();
            $table->uuid('business_id');
            $table->uuid('parent_id')->nullable();
            $table->text('name');
            $table->text('description')->nullable();
            $table->boolean('active')->default(true);
            $table->jsonb('metadata')->default('{}');
            $table->timestampsTz();

            $table->unique(['business_id', 'name']);
        });

        Schema::table('service_categories', function (Blueprint $table) {
            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
            $table->foreign('parent_id')->references('id')->on('service_categories')->onDelete('set null');
        });

        Schema::table('services', function (Blueprint $table) {
            $table->uuid('service_category_id')->nullable();
            $table->foreign('service_category_id')->references('id')->on('service_categories')->onDelete('set null');
        });
    }
};
