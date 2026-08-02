<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Delete duplicate new_appointment notifications (keep earliest one)
        $duplicateGroups = DB::table('notifications')
            ->where('type', 'new_appointment')
            ->whereNotNull('appointment_id')
            ->groupBy(['appointment_id', 'profile_id'])
            ->havingRaw('COUNT(*) > 1')
            ->select(DB::raw('appointment_id, profile_id, COUNT(*) as cnt'))
            ->get();

        foreach ($duplicateGroups as $group) {
            $keep = DB::table('notifications')
                ->where('appointment_id', $group->appointment_id)
                ->where('profile_id', $group->profile_id)
                ->where('type', 'new_appointment')
                ->orderBy('created_at')
                ->first(['id']);

            if ($keep) {
                DB::table('notifications')
                    ->where('appointment_id', $group->appointment_id)
                    ->where('profile_id', $group->profile_id)
                    ->where('type', 'new_appointment')
                    ->where('id', '!=', $keep->id)
                    ->delete();
            }
        }

        Schema::table('notifications', function (Blueprint $table) {
            if (!Schema::hasIndex('notifications', 'unique_notif_appointment_profile_type')) {
                $table->unique(['appointment_id', 'profile_id', 'type'], 'unique_notif_appointment_profile_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            try {
                $table->dropUnique('unique_notif_appointment_profile_type');
            } catch (\Exception $e) {
                // Index might not exist
            }
        });
    }
};
