<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_held_sales', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('branch_id')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('client_id')->nullable();
            $table->string('client_name')->nullable();
            $table->string('client_phone')->nullable();
            $table->json('cart');
            $table->string('payment_method', 50)->nullable();
            $table->string('payment_currency', 8)->nullable();
            $table->json('payments_breakdown')->nullable();
            $table->decimal('tip_amount', 12, 2)->default(0);
            $table->string('tip_currency', 8)->nullable();
            $table->text('notes')->nullable();
            $table->decimal('custom_total_amount', 12, 2)->nullable();
            $table->string('custom_total_currency', 8)->nullable();
            $table->boolean('are_products_included')->default(false);
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('profiles')->onDelete('set null');

            $table->index(['business_id', 'branch_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_held_sales');
    }
};
