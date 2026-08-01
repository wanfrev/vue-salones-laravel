<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            // Remove any duplicate new_appointment notifications first
            \App\Models\Notification::where('type', 'new_appointment')
                ->get()
                ->groupBy(['appointment_id', 'profile_id'])
                ->each(function ($group) {
                    if ($group->count() > 1) {
                        $group->skip(1)->each->delete();
                    }
                });

            // Add unique index to prevent duplicates
            if (!Schema::hasIndex('notifications', 'unique_new_appointment_per_profile')) {
                $table->unique(
                    ['appointment_id', 'profile_id', 'type'],
                    'unique_new_appointment_per_profile'
                );
            }
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            if (Schema::hasIndex('notifications', 'unique_new_appointment_per_profile')) {
                $table->dropUnique('unique_new_appointment_per_profile');
            }
        });
    }
};
