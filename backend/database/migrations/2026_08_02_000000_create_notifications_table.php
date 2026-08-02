<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('notifications')) {
            return;
        }

        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('profile_id');
            $table->string('type')->default('info');
            $table->string('title');
            $table->text('message')->default('');
            $table->uuid('appointment_id')->nullable();
            $table->string('client_name')->nullable();
            $table->string('client_phone')->nullable();
            $table->string('service_name')->nullable();
            $table->timestamp('appointment_time')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['business_id', 'profile_id', 'is_read'], 'idx_notif_biz_profile_read');
            $table->index(['business_id', 'type'], 'idx_notif_biz_type');
            $table->unique(['appointment_id', 'profile_id', 'type'], 'unique_notif_appointment_profile_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
