<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_payments', function (Blueprint $table) {
            if (!Schema::hasColumn('employee_payments', 'product_id')) {
                $table->uuid('product_id')->nullable()->after('branch_id');
                $table->foreign('product_id')->references('id')->on('products')->onDelete('set null');
            }
            if (!Schema::hasColumn('employee_payments', 'quantity')) {
                $table->decimal('quantity', 12, 2)->nullable()->after('product_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('employee_payments', function (Blueprint $table) {
            if (Schema::hasColumn('employee_payments', 'product_id')) {
                $table->dropForeign(['product_id']);
                $table->dropColumn('product_id');
            }
            if (Schema::hasColumn('employee_payments', 'quantity')) {
                $table->dropColumn('quantity');
            }
        });
    }
};
