<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mirrors services.show_in_public_booking (2026_08_11_000000): the public booking employee
 * picker had no way to hide non-client-facing staff (maintenance, cleaning, ...) who are still
 * active employees with agenda access but should never be offered to a client picking "cualquier
 * empleado". Defaults true so every existing employee keeps showing up exactly as before.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->boolean('show_in_public_booking')->default(true);
        });
    }

    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->dropColumn('show_in_public_booking');
        });
    }
};
