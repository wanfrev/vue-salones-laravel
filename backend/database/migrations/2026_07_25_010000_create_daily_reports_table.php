<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_reports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('branch_id')->nullable();
            $table->uuid('user_id')->nullable();

            $table->date('date');
            $table->decimal('exchange_rate', 15, 4)->default(0);
            
            $table->decimal('z_report_bs', 15, 2)->default(0);
            $table->decimal('z_report_usd', 15, 2)->default(0);
            
            // Bs Income
            $table->decimal('pos_bs', 15, 2)->default(0);
            $table->decimal('pago_movil_bs', 15, 2)->default(0);
            $table->decimal('cash_bs', 15, 2)->default(0);
            $table->decimal('transfer_bs', 15, 2)->default(0);
            
            // USD Income
            $table->decimal('cash_usd', 15, 2)->default(0);
            $table->decimal('zelle_usd', 15, 2)->default(0);
            $table->decimal('binance_usd', 15, 2)->default(0);
            $table->decimal('cashea_usd', 15, 2)->default(0);
            
            // Totals
            $table->decimal('total_bs', 15, 2)->default(0);
            $table->decimal('total_usd', 15, 2)->default(0);

            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
            $table->foreign('branch_id')->references('id')->on('branches')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_reports');
    }
};
