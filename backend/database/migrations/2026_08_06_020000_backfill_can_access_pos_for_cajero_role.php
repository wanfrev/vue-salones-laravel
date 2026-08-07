<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * can_access_pos defaults to false (2026_08_06_010000). Real cajero profiles already in
 * production predate that column and never had it set — without this backfill, the first
 * time perm:pos enforcement is switched on (config('niches.enforce') = true) every existing
 * cajero would be 403'd out of the POS screen they already use daily.
 *
 * 'cajero' is NOT a member of the Postgres `app_role` enum backing profiles.role — it never
 * has been, so no row can literally have role='cajero' (the frontend mapper already knows
 * this and always writes role: 'empleado' for a cajero). "Cajero" only exists as the
 * synthetic encoding the app treats as one everywhere else (store/auth.ts's isCajeroProfile,
 * equipoMapper.ts's isCajero): role='empleado' AND disable_agenda AND disable_inventory_edit.
 * That's what this backfill targets instead.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('profiles')
            ->where('role', 'empleado')
            ->where('disable_agenda', true)
            ->where('disable_inventory_edit', true)
            ->where('can_access_pos', false)
            ->update(['can_access_pos' => true]);
    }

    public function down(): void
    {
        // Intentionally a no-op: reversing would strip POS access from cajeros that may have
        // had it granted independently after this migration ran.
    }
};
