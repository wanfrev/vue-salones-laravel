<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        try {
            DB::statement('ALTER TABLE appointments ALTER COLUMN client_id DROP NOT NULL;');
        } catch (\Throwable $e) {
            Schema::table('appointments', function (Blueprint $table) {
                $table->uuid('client_id')->nullable()->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Keep nullable for safety
    }
};
