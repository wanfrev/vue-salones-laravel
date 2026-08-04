<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\PushSubscription;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class WebPushService
{
    /**
     * Envía una push por cada notificación recién creada, al dispositivo del
     * perfil dueño de esa notificación (antes se mandaba a todo el negocio) y
     * con el título y el mensaje reales (antes era un texto genérico).
     *
     * Nunca lanza: una push fallida no debe tumbar la petición ni el cron.
     */
    public function sendForNotifications(Collection|array $notifications): int
    {
        $notifications = collect($notifications)->filter();
        if ($notifications->isEmpty()) {
            return 0;
        }

        $publicKey = config('services.vapid.public_key');
        $privateKey = config('services.vapid.private_key');

        if (!$publicKey || !$privateKey) {
            Log::warning('[webpush] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY sin configurar: no se envía ninguna push.');
            return 0;
        }

        $profileIds = $notifications->pluck('profile_id')->filter()->unique();
        if ($profileIds->isEmpty()) {
            return 0;
        }

        $subscriptionsByProfile = PushSubscription::whereIn('profile_id', $profileIds)
            ->get()
            ->groupBy('profile_id');

        if ($subscriptionsByProfile->isEmpty()) {
            Log::info('[webpush] Ningún dispositivo suscrito para los perfiles notificados.');
            return 0;
        }

        try {
            $webPush = new WebPush([
                'VAPID' => [
                    'subject' => config('services.vapid.subject'),
                    'publicKey' => $publicKey,
                    'privateKey' => $privateKey,
                ],
            ]);

            $queued = 0;

            foreach ($notifications as $notification) {
                $subscriptions = $subscriptionsByProfile->get($notification->profile_id);
                if (!$subscriptions) {
                    continue;
                }

                foreach ($subscriptions as $sub) {
                    $webPush->queueNotification(
                        Subscription::create([
                            'endpoint' => $sub->endpoint,
                            'publicKey' => $sub->p256dh,
                            'authToken' => $sub->auth,
                        ]),
                        json_encode($this->payloadFor($notification)),
                    );
                    $queued++;
                }
            }

            if ($queued === 0) {
                return 0;
            }

            $sent = 0;

            foreach ($webPush->flush() as $report) {
                if ($report->isSuccess()) {
                    $sent++;
                    continue;
                }

                Log::warning("[webpush] Falló {$report->getEndpoint()}: {$report->getReason()}");

                // 404/410: el navegador descartó la suscripción, no sirve más.
                if ($report->isSubscriptionExpired()) {
                    PushSubscription::where('endpoint', $report->getEndpoint())->delete();
                }
            }

            return $sent;
        } catch (\Throwable $e) {
            Log::warning("[webpush] Error enviando push: {$e->getMessage()}");
            return 0;
        }
    }

    private function payloadFor(Notification $notification): array
    {
        return [
            'title' => $notification->title,
            'body' => $notification->message,
            'icon' => '/icon-192.png',
            'badge' => '/icon-192.png',
            // El tag por id evita que Android colapse notificaciones distintas
            // en una sola, cosa que sí pasaba con el tag fijo 'default'.
            'tag' => $notification->id,
            'data' => [
                'id' => $notification->id,
                'type' => $notification->type,
                'url' => $notification->appointment_id
                    ? "/admin?appointment={$notification->appointment_id}"
                    : '/admin',
            ],
        ];
    }
}
