<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * El índice unique(appointment_id, profile_id, type) se creó para evitar
     * notificaciones `new_appointment` duplicadas, pero al aplicar a TODOS los
     * tipos rompía tres flujos:
     *
     *   - el recordatorio de 1h chocaba con el de 24h (ambos type='reminder');
     *   - el segundo cambio de estado de una cita chocaba con el primero;
     *   - la notificación diaria de citas pendientes chocaba con la del día anterior.
     *
     * Cada choque lanzaba una QueryException que abortaba entero el comando
     * `reminders:generate`, así que tampoco corrían las alertas de stock bajo,
     * las de citas sin cobrar, ni el envío de push (que va al final).
     *
     * Lo reemplazamos por un índice parcial que solo cubre new_appointment,
     * que era la intención original.
     */
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            if (Schema::hasIndex('notifications', 'unique_notif_appointment_profile_type')) {
                $table->dropUnique('unique_notif_appointment_profile_type');
            }
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement(<<<'SQL'
                CREATE UNIQUE INDEX IF NOT EXISTS unique_notif_new_appointment_profile
                ON notifications (appointment_id, profile_id)
                WHERE type = 'new_appointment'
            SQL);
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS unique_notif_new_appointment_profile');
        }

        // Al volver atrás pueden existir filas que el índice amplio no admite,
        // así que se dejan solo las más antiguas de cada grupo.
        $duplicates = DB::table('notifications')
            ->whereNotNull('appointment_id')
            ->groupBy('appointment_id', 'profile_id', 'type')
            ->havingRaw('COUNT(*) > 1')
            ->get(['appointment_id', 'profile_id', 'type']);

        foreach ($duplicates as $group) {
            $keep = DB::table('notifications')
                ->where('appointment_id', $group->appointment_id)
                ->where('profile_id', $group->profile_id)
                ->where('type', $group->type)
                ->orderBy('created_at')
                ->value('id');

            DB::table('notifications')
                ->where('appointment_id', $group->appointment_id)
                ->where('profile_id', $group->profile_id)
                ->where('type', $group->type)
                ->where('id', '!=', $keep)
                ->delete();
        }

        Schema::table('notifications', function (Blueprint $table) {
            if (!Schema::hasIndex('notifications', 'unique_notif_appointment_profile_type')) {
                $table->unique(['appointment_id', 'profile_id', 'type'], 'unique_notif_appointment_profile_type');
            }
        });
    }
};
