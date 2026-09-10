<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            // Opt-in, defaults false — unlike can_access_dental_clinical (a permission, default
            // true for every employee), this is a UI simplification the admin turns on
            // specifically for the dentist so a secretary/assistant employee's menu is untouched.
            $table->boolean('gabinete_mode')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->dropColumn('gabinete_mode');
        });
    }
};
