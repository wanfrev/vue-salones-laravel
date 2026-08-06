<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public $withinTransaction = false;

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Añadir columnas a gift_cards
        Schema::table('gift_cards', function (Blueprint $table) {
            if (!Schema::hasColumn('gift_cards', 'code')) {
                $table->string('code')->nullable()->unique()->after('branch_id');
            }
            if (!Schema::hasColumn('gift_cards', 'buyer_name')) {
                $table->string('buyer_name')->nullable()->after('code');
            }
            if (!Schema::hasColumn('gift_cards', 'buyer_phone')) {
                $table->string('buyer_phone')->nullable()->after('buyer_name');
            }
        });

        // 2. Add 'gift_card' to payment_method enum if it exists
        // Supabase often creates enums. In postgres we can alter the enum type.
        try {
            DB::statement("ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'gift_card';");
        } catch (\Exception $e) {
            // Ignore error if type does not exist or driver is not postgres
            // SQLite for testing doesn't support this
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('gift_cards', function (Blueprint $table) {
            $columns = [];
            if (Schema::hasColumn('gift_cards', 'code')) {
                $columns[] = 'code';
            }
            if (Schema::hasColumn('gift_cards', 'buyer_name')) {
                $columns[] = 'buyer_name';
            }
            if (Schema::hasColumn('gift_cards', 'buyer_phone')) {
                $columns[] = 'buyer_phone';
            }

            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });

        // We don't remove from enum in down() because postgres does not support dropping enum values easily
    }
};
