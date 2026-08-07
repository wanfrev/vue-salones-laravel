<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * can_access_pos defaults to false (2026_08_06_010000). Real cajero profiles already in
 * production predate that column and never had it set — without this backfill, the first
 * time perm:pos enforcement is switched on (config('niches.enforce') = true) every existing
 * cajero would be 403'd out of the POS screen they already use daily.
 *
 * Scoped to the literal role='cajero' only, never the synthetic empleado+disable_agenda+
 * disable_inventory_edit encoding — that combination doesn't by itself imply POS usage, and
 * guessing wrong there would grant POS access to employees who never had it.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('profiles')
            ->where('role', 'cajero')
            ->where('can_access_pos', false)
            ->update(['can_access_pos' => true]);
    }

    public function down(): void
    {
        // Intentionally a no-op: reversing would strip POS access from cajeros that may have
        // had it granted independently after this migration ran.
    }
};
