<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('profile_id')->nullable();
            $table->text('endpoint');
            $table->text('p256dh');
            $table->text('auth');
            $table->string('user_agent')->nullable();
            $table->timestamps();

            $table->unique(['endpoint', 'auth', 'p256dh'], 'push_subscriptions_unique');
            $table->index('business_id');
            $table->index('profile_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
