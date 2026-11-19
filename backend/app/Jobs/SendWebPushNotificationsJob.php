<?php

namespace App\Jobs;

use App\Models\Notification;
use App\Services\WebPushService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

/**
 * Envía las notificaciones Web Push fuera de la petición HTTP que crea la cita o la
 * notificación, evitando que llamadas salientes a FCM/Apple/Mozilla bloqueen la UI.
 */
class SendWebPushNotificationsJob implements ShouldQueue
{
    use Dispatchable;
    use Queueable;

    public int $tries = 1;

    /**
     * @param  array<int, string>  $notificationIds
     */
    public function __construct(public array $notificationIds) {}

    public function handle(WebPushService $webPush): void
    {
        if (empty($this->notificationIds)) {
            return;
        }

        try {
            $notifications = Notification::whereIn('id', $this->notificationIds)->get();
            if ($notifications->isEmpty()) {
                return;
            }

            $webPush->sendForNotifications($notifications);
        } catch (\Throwable $e) {
            Log::warning("[SendWebPushNotificationsJob] Error enviando push: {$e->getMessage()}");
        }
    }
}
