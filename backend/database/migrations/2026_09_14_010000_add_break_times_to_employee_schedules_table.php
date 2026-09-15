<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_schedules', function (Blueprint $table) {
            // Nullable, independent of start_time/end_time — no break configured just means
            // the whole window counts as available (see AgendaCalendar's occupancy computation).
            $table->time('break_start')->nullable();
            $table->time('break_end')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('employee_schedules', function (Blueprint $table) {
            $table->dropColumn(['break_start', 'break_end']);
        });
    }
};
