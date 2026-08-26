<?php

namespace App\Console\Commands;

use App\Models\Notification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CleanupNotifications extends Command
{
    protected $signature = 'notifications:cleanup';
    protected $description = 'Delete read notifications older than 7 days and any notification older than 60 days, so the bell never grows unbounded if nobody clears it.';

    public function handle(): int
    {
        $readCutoff = now()->subDays(7);
        $allCutoff = now()->subDays(60);

        $readDeleted = Notification::where('is_read', true)
            ->where('read_at', '<', $readCutoff)
            ->delete();

        // Cualquier notificación (leída o no) que ya pasó los 60 días — esta nunca
        // puede alcanzar algo de "hoy" o "esta semana", el corte ya lo garantiza.
        $staleDeleted = Notification::where('created_at', '<', $allCutoff)
            ->delete();

        $this->info("[notifications:cleanup] Deleted {$readDeleted} read notifications (>7d) and {$staleDeleted} stale notifications (>60d).");
        Log::info("[notifications:cleanup] Deleted {$readDeleted} read (>7d) + {$staleDeleted} stale (>60d) notifications.");

        return self::SUCCESS;
    }
}
