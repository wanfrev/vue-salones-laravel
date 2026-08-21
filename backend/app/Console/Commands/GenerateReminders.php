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
        $whatsappSent = 0;
        $affectedBusinesses = [];
        $whatsappBizIds = [];

        \Illuminate\Support\Facades\Log::info('[reminders:generate] STARTING at ' . $now->toIso8601String());

        // 1. Generate reminders: appointments starting in ~N hours, N configurable per business
        $this->info('[reminders:generate] Checking appointments against configured reminder offsets...');

        $reminderBusinesses = Business::where('active', true)->get();

        foreach ($reminderBusinesses as $business) {
            $bizFeatures = $business->features ?? [];
            if (isset($bizFeatures['reminder_24h_enabled']) && !$bizFeatures['reminder_24h_enabled']) {
                continue;
            }

            $offsets = $this->reminderOffsetsFor($bizFeatures);
            if (empty($offsets)) {
                continue;
            }

            foreach ($offsets as $offsetHours) {
                $toleranceMinutes = max(10, (int) round($offsetHours * 60 * 0.1));
                $windowStart = $now->copy()->addMinutes($offsetHours * 60 - $toleranceMinutes);
                $windowEnd = $now->copy()->addMinutes($offsetHours * 60 + $toleranceMinutes);

                $appointments = Appointment::with(['client', 'service', 'employeeProfile', 'pet'])
                    ->where('business_id', $business->id)
                    ->whereIn('status', ['pending', 'confirmed'])
                    ->whereBetween('start_time', [$windowStart, $windowEnd])
                    ->get()
                    ->filter(fn (Appointment $appt) => !in_array($offsetHours, $appt->reminders_sent ?? [], false));

                \Illuminate\Support\Facades\Log::info("[reminders:generate] Business {$business->id}, offset {$offsetHours}h window ({$windowStart->toIso8601String()} to {$windowEnd->toIso8601String()}): found {$appointments->count()} appointments");

                if ($this->option('debug')) {
                    foreach ($appointments as $appt) {
                        $this->line("  - [{$offsetHours}h] Appointment {$appt->id}: {$appt->client?->full_name} — {$appt->service?->name} at {$appt->start_time} (status: {$appt->status})");
                    }
                }

                if ($appointments->isEmpty()) {
                    continue;
                }

                $appointmentIds = [];
                $label = $this->formatOffsetLabel($offsetHours);

                foreach ($appointments as $appt) {
                    $client = $appt->client;
                    $service = $appt->service;
                    if (!$client || !$service) {
                        \Illuminate\Support\Facades\Log::warning("[reminders:generate] {$offsetHours}h: Skipping appointment {$appt->id} — missing client or service");
                        continue;
                    }

                    $notifications = [];

                    $baseData = [
                        'business_id' => $appt->business_id,
                        'branch_id' => $appt->branch_id,
                        'appointment_id' => $appt->id,
                        'type' => 'reminder',
                        'title' => "Recordatorio de cita ({$label})",
                        'message' => "El cliente {$client->full_name} tiene cita de {$service->name}",
                        'client_name' => $client->full_name,
                        'client_phone' => $client->phone,
                        'service_name' => $service->name,
                        'appointment_time' => $appt->start_time,
                        'metadata' => [
                            'type' => 'reminder_offset',
                            'offset_hours' => $offsetHours,
                            'whatsapp_link' => $this->whatsappService->generateWhatsAppLink($client->phone),
                        ],
                    ];

                    if ($appt->employee_id) {
                        $notifications[] = array_merge($baseData, [
                            'profile_id' => $appt->employee_id,
                        ]);
                    }

                    $admins = $this->getAdminsToNotify($appt->business_id, $appt->branch_id, $appt->employee_id);

                    foreach ($admins as $admin) {
                        $notifications[] = array_merge($baseData, [
                            'profile_id' => $admin->id,
                        ]);
                    }

                    $totalGenerated += $this->notificationService->createMany($notifications)->count();

                    $appt->reminders_sent = array_merge($appt->reminders_sent ?? [], [$offsetHours]);
                    $appt->save();

                    $appointmentIds[] = $appt->id;
                    $affectedBusinesses[$appt->business_id] = true;
                }

                if (!empty($appointmentIds)) {
                    $this->sendWhatsAppReminders($appointments->whereIn('id', $appointmentIds), $whatsappBizIds, $whatsappSent);
                }
            }
        }

        $this->info("[reminders:generate] {$totalGenerated} reminder notifications generated.");

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

        $grandTotal = $totalGenerated + $unpaidGenerated + $lowStockGenerated;
        $this->info("[reminders:generate] Done. Total: {$grandTotal} (24h+1h reminders: {$totalGenerated}, unpaid: {$unpaidGenerated}, low stock: {$lowStockGenerated}). WhatsApp: {$whatsappSent} sent.");
        \Illuminate\Support\Facades\Log::info("[reminders:generate] DONE. Total: {$grandTotal} (24h+1h: {$totalGenerated}, unpaid: {$unpaidGenerated}, low stock: {$lowStockGenerated}), WhatsApp: {$whatsappSent}, affected businesses: " . implode(', ', array_keys($affectedBusinesses)));

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

    /**
     * Admin-configurable list of "hours before" reminder offsets, from
     * businesses.features.appointment_reminder_offsets_hours. Falls back to the
     * historical 24h + 1h pair when the business hasn't configured anything.
     * Values are clamped to a sane range and de-duplicated.
     *
     * @return float[]
     */
    private function reminderOffsetsFor(array $bizFeatures): array
    {
        $raw = $bizFeatures['appointment_reminder_offsets_hours'] ?? [24, 1];

        if (!is_array($raw)) {
            return [];
        }

        $offsets = [];
        foreach ($raw as $value) {
            $hours = (float) $value;
            if ($hours > 0 && $hours <= 720) {
                $offsets[] = round($hours, 2);
            }
        }

        return array_values(array_unique($offsets));
    }

    private function formatOffsetLabel(float $hours): string
    {
        if ($hours < 1) {
            $minutes = (int) round($hours * 60);
            return "{$minutes} " . ($minutes === 1 ? 'minuto' : 'minutos');
        }

        if (floor($hours) == $hours) {
            $whole = (int) $hours;
            return "{$whole} " . ($whole === 1 ? 'hora' : 'horas');
        }

        return rtrim(rtrim(number_format($hours, 2), '0'), '.') . ' horas';
    }

}
