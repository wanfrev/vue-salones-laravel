<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            if (!Schema::hasColumn('notifications', 'branch_id')) {
                $table->uuid('branch_id')->nullable()->after('business_id');
                $table->index(['business_id', 'branch_id'], 'idx_notif_biz_branch');
            }
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            if (Schema::hasIndex('notifications', 'idx_notif_biz_branch')) {
                $table->dropIndex('idx_notif_biz_branch');
            }
            if (Schema::hasColumn('notifications', 'branch_id')) {
                $table->dropColumn('branch_id');
            }
        });
    }
};
