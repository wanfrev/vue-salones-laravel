<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('businesses', function (Blueprint $table) {
            if (!Schema::hasColumn('businesses', 'whatsapp_enabled')) {
                $table->boolean('whatsapp_enabled')->default(false);
            }
            if (!Schema::hasColumn('businesses', 'whatsapp_instance_id')) {
                $table->string('whatsapp_instance_id')->nullable();
            }
            if (!Schema::hasColumn('businesses', 'whatsapp_instance_status')) {
                $table->string('whatsapp_instance_status')->nullable()->default('disconnected');
            }
            if (!Schema::hasColumn('businesses', 'whatsapp_instance_number')) {
                $table->string('whatsapp_instance_number')->nullable();
            }
            if (!Schema::hasColumn('businesses', 'whatsapp_base_url')) {
                $table->text('whatsapp_base_url')->nullable();
            }
            if (!Schema::hasColumn('businesses', 'whatsapp_api_key')) {
                $table->text('whatsapp_api_key')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('businesses', function (Blueprint $table) {
            $table->dropColumn([
                'whatsapp_enabled',
                'whatsapp_instance_id',
                'whatsapp_instance_status',
                'whatsapp_instance_number',
                'whatsapp_base_url',
                'whatsapp_api_key',
            ]);
        });
    }
};
