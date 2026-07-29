<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daily_reports', function (Blueprint $table) {
            if (!Schema::hasColumn('daily_reports', 'credit_usd')) {
                $table->decimal('credit_usd', 15, 2)->default(0)->after('cashea_usd');
            }
            if (!Schema::hasColumn('daily_reports', 'credit_bs')) {
                $table->decimal('credit_bs', 15, 2)->default(0);
            }
            if (!Schema::hasColumn('daily_reports', 'credits_detail')) {
                $table->json('credits_detail')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('daily_reports', function (Blueprint $table) {
            $columns = [];
            if (Schema::hasColumn('daily_reports', 'credit_usd')) $columns[] = 'credit_usd';
            if (Schema::hasColumn('daily_reports', 'credit_bs')) $columns[] = 'credit_bs';
            if (Schema::hasColumn('daily_reports', 'credits_detail')) $columns[] = 'credits_detail';
            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};
