<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('profiles', 'employee_ves_rate')) {
            Schema::table('profiles', function (Blueprint $table) {
                $table->float('employee_ves_rate')->nullable();
            });
        }

        if (!Schema::hasColumn('businesses', 'employee_ves_rate')) {
            Schema::table('businesses', function (Blueprint $table) {
                $table->float('employee_ves_rate')->nullable();
            });
        }
    }

    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->dropColumn('employee_ves_rate');
        });

        Schema::table('businesses', function (Blueprint $table) {
            $table->dropColumn('employee_ves_rate');
        });
    }
};
