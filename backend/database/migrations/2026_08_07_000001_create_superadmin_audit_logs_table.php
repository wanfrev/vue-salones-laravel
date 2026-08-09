<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Persisted trail for sensitive superadmin actions (impersonating a business admin,
 * resetting an admin's password). No update path is exposed anywhere — rows are
 * write-once, append-only, which is the point of an audit log.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('superadmin_audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('actor_id');
            $table->string('action', 100);
            $table->uuid('business_id')->nullable();
            $table->uuid('target_profile_id')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('actor_id');
            $table->index('business_id');
            $table->index('target_profile_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('superadmin_audit_logs');
    }
};
