<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public $withinTransaction = false;

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        try {
            DB::statement("ALTER TYPE appointment_source ADD VALUE IF NOT EXISTS 'pos_direct';");
        } catch (\Throwable $e) {
            // Ignore if enum type appointment_source does not exist or driver is sqlite
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Postgres does not support dropping enum values easily
    }
};
