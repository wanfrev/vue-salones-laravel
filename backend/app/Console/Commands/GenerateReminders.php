<?php

namespace App\Console\Commands;

use App\Events\EntityChanged;
use App\Models\Appointment;
use App\Models\Business;
use App\Models\InventoryStock;
use App\Models\MessageTemplate;
use App\Models\Profile;
use App\Services\NotificationService;
use App\Services\WhatsAppService;
use Illuminate\Console\Command;

class GenerateReminders extends Command
{
    protected $signature = 'reminders:generate {--debug : Show verbose debug output}';
    protected $description = 'Generate appointment reminders, unpaid alerts, and low stock notifications.';

    public function __construct(
        private NotificationService $notificationService,
        private WhatsAppService $whatsappService,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $now = now();
        $totalGenerated = 0;
        $unpaidGenerated = 0;
        $lowStockGenerated = 0;
        $pendingGenerated = 0;
        $whatsappSent = 0;
        $affectedBusinesses = [];
        $whatsappBizIds = [];

        \Illuminate\Support\Facades\Log::info('[reminders:generate] STARTING at ' . $now->toIso8601String());

        // 1. Generate reminders: appointments starting in ~24h
        $this->info('[reminders:generate] Checking appointments in ~24h window...');

        $in22h = $now->copy()->addHours(22);
        $in26h = $now->copy()->addHours(26);

        $appointments = Appointment::with(['client', 'service', 'employeeProfile', 'pet'])
            ->whereNull('reminder_sent_at')
            ->whereIn('status', ['pending', 'confirmed'])
            ->whereBetween('start_time', [$in22h, $in26h])
            ->get();

        \Illuminate\Support\Facades\Log::info("[reminders:generate] 24h window ({$in22h->toIso8601String()} to {$in26h->toIso8601String()}): found {$appointments->count()} appointments");

        if ($this->option('debug')) {
            foreach ($appointments as $appt) {
                $this->line("  - Appointment {$appt->id}: {$appt->client?->full_name} — {$appt->service?->name} at {$appt->start_time} (status: {$appt->status})");
            }
        }

        if ($appointments->isNotEmpty()) {
            $appointmentIds = [];

            foreach ($appointments as $appt) {
                $client = $appt->client;
                $service = $appt->service;
                if (!$client || !$service) {
                    \Illuminate\Support\Facades\Log::warning("[reminders:generate] 24h: Skipping appointment {$appt->id} — missing client or service");
                    continue;
                }

                // Check if internal reminders are enabled for this business
                $biz = Business::find($appt->business_id);
                $bizFeatures = $biz?->features ?? [];
                if (isset($bizFeatures['reminder_24h_enabled']) && !$bizFeatures['reminder_24h_enabled']) {
                    \Illuminate\Support\Facades\Log::debug("[reminders:generate] 24h: Skipping appointment {$appt->id} — reminder_24h_enabled is false for business {$appt->business_id}");
                    continue;
                }

                // Skip 24h reminder if a new_appointment notification already exists for this appointment
                // (the user was already notified at creation time, avoid duplicate perception)
                $existingNewApptNotif = \App\Models\Notification::where('business_id', $appt->business_id)
                    ->where('appointment_id', $appt->id)
                    ->where('type', 'new_appointment')
                    ->exists();

                if ($existingNewApptNotif) {
                    \Illuminate\Support\Facades\Log::info("[reminders:generate] 24h: Skipping appointment {$appt->id} — already has a new_appointment notification");
                    $appointmentIds[] = $appt->id;
                    $affectedBusinesses[$appt->business_id] = true;
                    continue;
                }

                $notifications = [];

                $baseData = [
                    'business_id' => $appt->business_id,
                    'branch_id' => $appt->branch_id,
                    'appointment_id' => $appt->id,
                    'type' => 'reminder',
                    'title' => 'Recordatorio de cita (24 horas)',
                    'message' => "El cliente {$client->full_name} tiene cita de {$service->name}",
                    'client_name' => $client->full_name,
                    'client_phone' => $client->phone,
                    'service_name' => $service->name,
                    'appointment_time' => $appt->start_time,
                    'metadata' => [
                        'type' => 'reminder_24h',
                        'whatsapp_link' => $this->whatsappService->generateWhatsAppLink($client->phone),
                    ],
                ];

                $notifications[] = array_merge($baseData, [
                    'profile_id' => $appt->employee_id,
                ]);

                $admins = $this->getAdminsToNotify($appt->business_id, $appt->branch_id, $appt->employee_id);

                foreach ($admins as $admin) {
                    $notifications[] = array_merge($baseData, [
                        'profile_id' => $admin->id,
                    ]);
                }

                $totalGenerated += $this->notificationService->createMany($notifications)->count();

                $appointmentIds[] = $appt->id;
                $affectedBusinesses[$appt->business_id] = true;
            }

            if (!empty($appointmentIds)) {
                $this->sendWhatsAppReminders($appointments->whereIn('id', $appointmentIds), $whatsappBizIds, $whatsappSent);

                Appointment::whereIn('id', $appointmentIds)->update([
                    'reminder_sent_at' => now(),
                ]);
            }
        }

        $this->info("[reminders:generate] {$totalGenerated} reminder (24h) notifications generated.");

        // 2. Generate reminders: appointments starting in ~1h
        $this->info('[reminders:generate] Checking appointments in ~1h window...');

        $in50m = $now->copy()->addMinutes(50);
        $in70m = $now->copy()->addMinutes(70);

        $appointmentsIn1h = Appointment::with(['client', 'service', 'employeeProfile', 'pet'])
            ->whereNull('reminder_1h_sent_at')
            ->whereIn('status', ['pending', 'confirmed'])
            ->whereBetween('start_time', [$in50m, $in70m])
            ->get();

        \Illuminate\Support\Facades\Log::info("[reminders:generate] 1h window ({$in50m->toIso8601String()} to {$in70m->toIso8601String()}): found {$appointmentsIn1h->count()} appointments");

        if ($appointmentsIn1h->isNotEmpty()) {
            $appointmentIds1h = [];

            foreach ($appointmentsIn1h as $appt) {
                $client = $appt->client;
                $service = $appt->service;
                if (!$client || !$service) {
                    \Illuminate\Support\Facades\Log::warning("[reminders:generate] 1h: Skipping appointment {$appt->id} — missing client or service");
                    continue;
                }

                $biz = Business::find($appt->business_id);
                $bizFeatures = $biz?->features ?? [];
                if (isset($bizFeatures['reminder_24h_enabled']) && !$bizFeatures['reminder_24h_enabled']) {
                    continue;
                }

                // Skip 1h reminder if a new_appointment notification already exists
                $existingNewApptNotif = \App\Models\Notification::where('business_id', $appt->business_id)
                    ->where('appointment_id', $appt->id)
                    ->where('type', 'new_appointment')
                    ->exists();

                if ($existingNewApptNotif) {
                    \Illuminate\Support\Facades\Log::info("[reminders:generate] 1h: Skipping appointment {$appt->id} — already has a new_appointment notification");
                    $appointmentIds1h[] = $appt->id;
                    $affectedBusinesses[$appt->business_id] = true;
                    continue;
                }

                $notifications = [];

                $baseData = [
                    'business_id' => $appt->business_id,
                    'branch_id' => $appt->branch_id,
                    'appointment_id' => $appt->id,
                    'type' => 'reminder',
                    'title' => 'Recordatorio de cita (1 hora)',
                    'message' => "El cliente {$client->full_name} tiene cita de {$service->name} en 1 hora",
                    'client_name' => $client->full_name,
                    'client_phone' => $client->phone,
                    'service_name' => $service->name,
                    'appointment_time' => $appt->start_time,
                    'metadata' => [
                        'type' => 'reminder_1h',
                        'whatsapp_link' => $this->whatsappService->generateWhatsAppLink($client->phone),
                    ],
                ];

                $notifications[] = array_merge($baseData, [
                    'profile_id' => $appt->employee_id,
                ]);

                $admins = $this->getAdminsToNotify($appt->business_id, $appt->branch_id, $appt->employee_id);

                foreach ($admins as $admin) {
                    $notifications[] = array_merge($baseData, [
                        'profile_id' => $admin->id,
                    ]);
                }

                $totalGenerated += $this->notificationService->createMany($notifications)->count();

                $appointmentIds1h[] = $appt->id;
                $affectedBusinesses[$appt->business_id] = true;
            }

            if (!empty($appointmentIds1h)) {
                $this->sendWhatsAppReminders($appointmentsIn1h->whereIn('id', $appointmentIds1h), $whatsappBizIds, $whatsappSent);

                Appointment::whereIn('id', $appointmentIds1h)->update([
                    'reminder_1h_sent_at' => now(),
                ]);
            }
        }

        $this->info("[reminders:generate] {$totalGenerated} total reminders (24h + 1h) generated.");

        // 3. Generate pending appointments reminders (configurable hour)
        $this->info('[reminders:generate] Checking pending appointments for notifications...');

        $dayAgo = $now->copy()->subDay();
        $businesses = Business::where('active', true)->get();

        foreach ($businesses as $business) {
            $features = $business->features ?? [];
            $pendingNotificationHour = $features['pending_notifications_hour'] ?? null;
            $pendingNotificationsEnabled = $features['pending_notifications_enabled'] ?? false;

            if (!$pendingNotificationsEnabled || $pendingNotificationHour === null) {
                if ($this->option('debug')) {
                    $this->line("  - Business {$business->id} ({$business->name}): pending_notifications_enabled=" . ($pendingNotificationsEnabled ? 'true' : 'false') . ", hour=" . ($pendingNotificationHour ?? 'null'));
                }
                continue;
            }

            // Allow 0 (midnight) through 23 as valid hours
            $hour = (int) $pendingNotificationHour;

            $today = $now->copy()->startOfDay();
            $targetTime = $today->copy()->setHour($hour)->setMinute(0)->setSecond(0);

            $minutesSinceTarget = $now->diffInMinutes($targetTime, false);

            \Illuminate\Support\Facades\Log::info("[reminders:generate] Business {$business->id}: pending_notifications_hour={$hour}, target_time={$targetTime->toIso8601String()}, now={$now->toIso8601String()}, minutes_since_target={$minutesSinceTarget}");

            // Fire if we're within the 60-minute window after the target time
            if ($minutesSinceTarget >= 0 && $minutesSinceTarget < 60) {
                $pendingAppts = Appointment::with(['client', 'service', 'branch'])
                    ->where('business_id', $business->id)
                    ->where('status', 'pending')
                    ->whereDate('start_time', '<=', $today)
                    ->where(function ($query) use ($dayAgo) {
                        $query->whereNull('pending_reminder_sent_at')
                            ->orWhere('pending_reminder_sent_at', '<', $dayAgo);
                    })
                    ->get();

                if ($pendingAppts->isNotEmpty()) {
                    $admins = $this->getAdminsToNotify($business->id, null);

                    $isMultiBranch = $pendingAppts->pluck('branch_id')->unique()->count() > 1;

                    if ($isMultiBranch) {
                        $byBranch = $pendingAppts->groupBy('branch_id');
                        $branchLines = [];
                        foreach ($byBranch as $branchId => $appts) {
                            $branchName = $appts->first()->branch?->name ?? 'General';
                            $line = "{$branchName}: ";
                            $line .= $appts->take(5)->map(fn($a) => "{$a->client?->full_name} - {$a->service?->name} ({$a->start_time->format('H:i')})")->implode(', ');
                            if ($appts->count() > 5) {
                                $line .= ' y ' . ($appts->count() - 5) . ' más';
                            }
                            $branchLines[] = $line;
                        }
                        $appointmentList = implode("\n", $branchLines);
                    } else {
                        $shown = $pendingAppts->take(10);
                        $appointmentList = $shown->map(fn($a) => "{$a->client?->full_name} - {$a->service?->name} ({$a->start_time->format('H:i')})")->implode(', ');
                        if ($pendingAppts->count() > 10) {
                            $appointmentList .= ' y ' . ($pendingAppts->count() - 10) . ' más';
                        }
                    }

                    $pendingRows = [];
                    foreach ($admins as $admin) {
                        $pendingRows[] = [
                            'business_id' => $business->id,
                            'profile_id' => $admin->id,
                            'type' => 'pending_appointments',
                            'title' => 'Citas pendientes de confirmación',
                            'message' => "Tienes {$pendingAppts->count()} cita(s) sin confirmar:\n{$appointmentList}",
                            'metadata' => [
                                'type' => 'pending_appointments',
                                'pending_count' => $pendingAppts->count(),
                            ],
                        ];
                    }
                    $pendingGenerated += $this->notificationService->createMany($pendingRows)->count();

                    Appointment::whereIn('id', $pendingAppts->pluck('id'))->update([
                        'pending_reminder_sent_at' => now(),
                    ]);

                    $affectedBusinesses[$business->id] = true;
                }
            }
        }

        $this->info("[reminders:generate] {$pendingGenerated} pending appointment notifications generated.");

        // 4. Generate unpaid alerts: confirmed >24h ago, not paid
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

                $existingAlert = \App\Models\Notification::where('business_id', $appt->business_id)
                    ->where('appointment_id', $appt->id)
                    ->where('type', 'unpaid_alert')
                    ->exists();

                if ($existingAlert) continue;

                $admins = $this->getAdminsToNotify($appt->business_id, $appt->branch_id);

                $unpaidRows = [];
                foreach ($admins as $admin) {
                    $unpaidRows[] = [
                        'business_id' => $appt->business_id,
                        'branch_id' => $appt->branch_id,
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
                    ];
                }
                $unpaidGenerated += $this->notificationService->createMany($unpaidRows)->count();

                $affectedBusinesses[$appt->business_id] = true;
            }
        }

        $this->info("[reminders:generate] {$unpaidGenerated} unpaid alert notifications generated.");

        // 5. Low stock alerts
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

                $admins = $this->getAdminsToNotify($bizId, null);

                $lowStockRows = [];
                foreach ($admins as $admin) {
                    $lowStockRows[] = [
                        'business_id' => $bizId,
                        'profile_id' => $admin->id,
                        'type' => 'low_stock',
                        'title' => 'Stock bajo',
                        'message' => "{$count} producto(s) con stock bajo: " . implode(', ', $names) . $extra,
                        'metadata' => ['product_count' => $count],
                    ];
                }
                $lowStockGenerated += $this->notificationService->createMany($lowStockRows)->count();

                $affectedBusinesses[$bizId] = true;
            }
        }

        $this->info("[reminders:generate] {$lowStockGenerated} low stock notifications generated.");

        $grandTotal = $totalGenerated + $unpaidGenerated + $lowStockGenerated + $pendingGenerated;
        $this->info("[reminders:generate] Done. Total: {$grandTotal} (24h+1h reminders: {$totalGenerated}, unpaid: {$unpaidGenerated}, pending: {$pendingGenerated}, low stock: {$lowStockGenerated}). WhatsApp: {$whatsappSent} sent.");
        \Illuminate\Support\Facades\Log::info("[reminders:generate] DONE. Total: {$grandTotal} (24h+1h: {$totalGenerated}, unpaid: {$unpaidGenerated}, pending: {$pendingGenerated}, low stock: {$lowStockGenerated}), WhatsApp: {$whatsappSent}, affected businesses: " . implode(', ', array_keys($affectedBusinesses)));

        // Broadcast real-time event so frontend picks up new notifications
        $allAffectedBizIds = array_unique(array_merge(array_keys($affectedBusinesses), array_keys($whatsappBizIds)));
        foreach ($allAffectedBizIds as $bizId) {
            EntityChanged::safe($bizId, 'notification', 'created');
        }

        // Las push ya salieron desde NotificationService::createMany(), una por
        // notificación, al perfil destinatario y con su título/mensaje reales.

        return self::SUCCESS;
    }

    private function sendWhatsAppReminders($appointments, array &$whatsappBizIds, int &$whatsappSent): void
    {
        foreach ($appointments as $appt) {
            $business = Business::find($appt->business_id);
            if (!$business || !$business->whatsapp_enabled || !$business->whatsapp_instance_id) {
                continue;
            }

            $features = $business->features ?? [];
            if (!($features['whatsapp_available'] ?? false)) {
                continue;
            }
            if (!($features['whatsapp_reminders_enabled'] ?? true)) {
                continue;
            }

            if (!$appt->client || !$appt->client->phone) {
                continue;
            }

            $template = MessageTemplate::where('business_id', $appt->business_id)
                ->where('type', 'appointment_reminder')
                ->where('is_active', true)
                ->first();

            $body = $template?->body ?? 'Hola {cliente}, recuerda tu cita de {servicio} el {fecha} a las {hora}. ¡Te esperamos en {negocio}!';

            $success = $this->whatsappService->sendReminder($appt, $body);
            if ($success) {
                $whatsappSent++;
                $whatsappBizIds[$appt->business_id] = true;
            }
        }

        $this->info("[reminders:generate] {$whatsappSent} WhatsApp reminders sent.");
    }

    private function getAdminsToNotify(string $businessId, ?string $branchId, ?string $excludeProfileId = null)
    {
        return Profile::where('business_id', $businessId)
            ->where('active', true)
            ->where(function ($query) use ($branchId) {
                $query->whereIn('role', ['admin', 'superadmin']);
                if ($branchId) {
                    $query->orWhere(function ($q) use ($branchId) {
                        $q->where('role', 'encargado')
                          ->where('branch_id', $branchId);
                    });
                }
            })
            ->when($excludeProfileId, function ($query) use ($excludeProfileId) {
                $query->where('id', '!=', $excludeProfileId);
            })
            ->get();
    }

}
