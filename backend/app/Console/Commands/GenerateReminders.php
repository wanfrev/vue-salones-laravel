<?php

namespace App\Console\Commands;

use App\Events\EntityChanged;
use App\Models\Appointment;
use App\Models\InventoryStock;
use App\Models\Profile;
use App\Models\PushSubscription;
use App\Services\NotificationService;
use Illuminate\Console\Command;
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

class GenerateReminders extends Command
{
    protected $signature = 'reminders:generate';
    protected $description = 'Generate appointment reminders, unpaid alerts, and low stock notifications.';

    public function __construct(
        private NotificationService $notificationService,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $now = now();
        $totalGenerated = 0;
        $unpaidGenerated = 0;
        $lowStockGenerated = 0;
        $affectedBusinesses = [];

        // 1. Generate reminders: appointments starting in ~24h
        $this->info('[reminders:generate] Checking appointments in ~24h window...');

        $in22h = $now->copy()->addHours(22);
        $in26h = $now->copy()->addHours(26);

        $appointments = Appointment::with(['client', 'service', 'employeeProfile'])
            ->whereNull('reminder_sent_at')
            ->whereIn('status', ['pending', 'confirmed'])
            ->whereBetween('start_time', [$in22h, $in26h])
            ->get();

        if ($appointments->isNotEmpty()) {
            $appointmentIds = [];

            foreach ($appointments as $appt) {
                $client = $appt->client;
                $service = $appt->service;
                if (!$client || !$service) continue;

                $notifications = [];

                $baseData = [
                    'business_id' => $appt->business_id,
                    'appointment_id' => $appt->id,
                    'type' => 'reminder',
                    'title' => 'Recordatorio de cita',
                    'message' => "El cliente {$client->full_name} tiene cita de {$service->name}",
                    'client_name' => $client->full_name,
                    'client_phone' => $client->phone,
                    'service_name' => $service->name,
                    'appointment_time' => $appt->start_time,
                    'metadata' => [],
                ];

                $notifications[] = array_merge($baseData, [
                    'profile_id' => $appt->employee_id,
                ]);

                $admins = Profile::where('business_id', $appt->business_id)
                    ->where('role', 'admin')
                    ->where('active', true)
                    ->where('id', '!=', $appt->employee_id)
                    ->get();

                foreach ($admins as $admin) {
                    $notifications[] = array_merge($baseData, [
                        'profile_id' => $admin->id,
                    ]);
                }

                foreach ($notifications as $n) {
                    $this->notificationService->create($n);
                    $totalGenerated++;
                }

                $appointmentIds[] = $appt->id;
                $affectedBusinesses[$appt->business_id] = true;
            }

            if (!empty($appointmentIds)) {
                Appointment::whereIn('id', $appointmentIds)->update([
                    'reminder_sent_at' => now(),
                ]);
            }
        }

        $this->info("[reminders:generate] {$totalGenerated} reminder notifications generated.");

        // 2. Generate unpaid alerts: confirmed >24h ago, not paid
        $this->info('[reminders:generate] Checking unpaid confirmed appointments...');

        $twentyFourHoursAgo = $now->copy()->subHours(24);

        $unpaidAppts = Appointment::with(['client', 'service'])
            ->where('status', 'confirmed')
            ->where('payment_status', '!=', 'paid')
            ->where('start_time', '<=', $twentyFourHoursAgo)
            ->get();

        if ($unpaidAppts->isNotEmpty()) {
            foreach ($unpaidAppts as $appt) {
                $client = $appt->client;
                $service = $appt->service;
                if (!$client || !$service) continue;

                $existingAlert = \App\Models\Notification::where('appointment_id', $appt->id)
                    ->where('type', 'unpaid_alert')
                    ->exists();

                if ($existingAlert) continue;

                $admins = Profile::where('business_id', $appt->business_id)
                    ->where('role', 'admin')
                    ->where('active', true)
                    ->get();

                foreach ($admins as $admin) {
                    $this->notificationService->create([
                        'business_id' => $appt->business_id,
                        'profile_id' => $admin->id,
                        'appointment_id' => $appt->id,
                        'type' => 'unpaid_alert',
                        'title' => 'Cita confirmada sin cobrar',
                        'message' => "Cita de {$client->full_name} — {$service->name} confirmada hace más de 24h sin cobro",
                        'client_name' => $client->full_name,
                        'client_phone' => $client->phone,
                        'service_name' => $service->name,
                        'appointment_time' => $appt->start_time,
                        'metadata' => [],
                    ]);
                    $unpaidGenerated++;
                }

                $affectedBusinesses[$appt->business_id] = true;
            }
        }

        $this->info("[reminders:generate] {$unpaidGenerated} unpaid alert notifications generated.");

        // 3. Low stock alerts
        $this->info('[reminders:generate] Checking low stock products...');

        $lowStockProducts = InventoryStock::with('product')
            ->whereHas('product', function ($q) {
                $q->where('active', true)
                    ->where('is_sellable', true)
                    ->where('reorder_point', '>', 0)
                    ->whereColumn('inventory_stock.quantity', '<=', 'products.reorder_point');
            })
            ->get()
            ->groupBy('business_id');

        if ($lowStockProducts->isNotEmpty()) {
            foreach ($lowStockProducts as $bizId => $stocks) {
                $names = $stocks->pluck('product.name')->unique()->take(5)->toArray();
                $count = $stocks->pluck('product.id')->unique()->count();
                $remaining = $count - 5;
                $extra = $count > 5 ? " y {$remaining} más" : '';

                \App\Models\Notification::where('business_id', $bizId)
                    ->where('type', 'low_stock')
                    ->delete();

                $admins = Profile::where('business_id', $bizId)
                    ->where('role', 'admin')
                    ->where('active', true)
                    ->get();

                foreach ($admins as $admin) {
                    $this->notificationService->create([
                        'business_id' => $bizId,
                        'profile_id' => $admin->id,
                        'type' => 'low_stock',
                        'title' => 'Stock bajo',
                        'message' => "{$count} producto(s) con stock bajo: " . implode(', ', $names) . $extra,
                        'metadata' => ['product_count' => $count],
                    ]);
                    $lowStockGenerated++;
                }

                $affectedBusinesses[$bizId] = true;
            }
        }

        $this->info("[reminders:generate] {$lowStockGenerated} low stock notifications generated.");

        $grandTotal = $totalGenerated + $unpaidGenerated + $lowStockGenerated;
        $this->info("[reminders:generate] Done. Total: {$grandTotal}");

        // Broadcast real-time event so frontend picks up new notifications
        foreach (array_keys($affectedBusinesses) as $bizId) {
            EntityChanged::safe($bizId, 'notification', 'created');
        }

        // Send web push notifications to all subscribed devices
        if ($grandTotal > 0) {
            $this->sendPushNotifications(array_keys($affectedBusinesses));
        }

        return self::SUCCESS;
    }

    private function sendPushNotifications(array $businessIds): void
    {
        try {
            $auth = [
                'VAPID' => [
                    'subject' => config('services.vapid.subject', env('VAPID_SUBJECT', 'mailto:admin@luma.app')),
                    'publicKey' => env('VAPID_PUBLIC_KEY'),
                    'privateKey' => env('VAPID_PRIVATE_KEY'),
                ],
            ];

            $webPush = new WebPush($auth);

            $subscriptions = PushSubscription::whereIn('business_id', $businessIds)->get();

            if ($subscriptions->isEmpty()) return;

            foreach ($subscriptions as $sub) {
                $pushSub = Subscription::create([
                    'endpoint' => $sub->endpoint,
                    'publicKey' => $sub->p256dh,
                    'authToken' => $sub->auth,
                ]);

                $webPush->queueNotification(
                    $pushSub,
                    json_encode([
                        'title' => 'Nuevas notificaciones',
                        'body' => 'Tienes recordatorios o alertas pendientes.',
                        'icon' => '/icon-192.png',
                        'badge' => '/icon-192.png',
                        'data' => ['url' => '/admin'],
                    ])
                );
            }

            foreach ($webPush->flush() as $report) {
                if (!$report->isSuccess()) {
                    \Illuminate\Support\Facades\Log::warning(
                        "WebPush failed for {$report->getEndpoint()}: {$report->getReason()}"
                    );

                    if ($report->isSubscriptionExpired()) {
                        PushSubscription::where('endpoint', $report->getEndpoint())->delete();
                    }
                }
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("WebPush send failed: {$e->getMessage()}");
        }
    }
}
