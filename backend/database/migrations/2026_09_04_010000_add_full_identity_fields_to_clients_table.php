<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            // Supplementary structured name parts — full_name stays the single field the rest of
            // the app (search, agenda, POS, WhatsApp) reads and writes; these are additive only.
            $table->string('middle_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('second_last_name')->nullable();
            $table->string('document_id')->nullable();
            $table->string('medical_insurance')->nullable();
            $table->string('emergency_phone')->nullable();

            $table->index(['business_id', 'document_id']);
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropIndex(['business_id', 'document_id']);
            $table->dropColumn([
                'middle_name', 'last_name', 'second_last_name',
                'document_id', 'medical_insurance', 'emergency_phone',
            ]);
        });
    }
};
