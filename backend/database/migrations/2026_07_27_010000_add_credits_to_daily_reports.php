<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daily_reports', function (Blueprint $table) {
            $table->decimal('credit_bs', 15, 2)->default(0)->after('transfer_bs');
            $table->decimal('credit_usd', 15, 2)->default(0)->after('cashea_usd');
        });
    }

    public function down(): void
    {
        Schema::table('daily_reports', function (Blueprint $table) {
            $table->dropColumn(['credit_bs', 'credit_usd']);
        });
    }
};
