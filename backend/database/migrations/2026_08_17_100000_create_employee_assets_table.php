<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Material items assigned to an employee — a vehicle, a phone, a laptop, etc. First user: the
 * staffing CRM's "editar vendedor" panel, where an admin tracks what gear a vendedor is carrying.
 * Not staffing-specific in shape (just business_id + employee_id), so any niche's employee could
 * use this later without a schema change.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('employee_assets')) {
            return;
        }

        Schema::create('employee_assets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('employee_id');

            // 'vehiculo' | 'telefono' | 'laptop' | 'otro'
            $table->string('asset_type');
            $table->string('description');

            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
            $table->foreign('employee_id')->references('id')->on('profiles')->onDelete('cascade');
            $table->index('business_id');
            $table->index('employee_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_assets');
    }
};
