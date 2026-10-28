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
use Illuminate\Support\Facades\Cache;

class GenerateReminders extends Command
{
    protected $signature = 'reminders:generate {--debug : Show verbose debug output}';
    protected $description = 'Generate appointment reminders, unpaid alerts, and low stock notifications.';

    /** Tope de la holgura de la ventana de un seguimiento (el resto de plantillas usa 10% del offset). */
    private const FOLLOW_UP_MAX_TOLERANCE_MINUTES = 60;

    public function __construct(
        private NotificationService $notificationService,
        private WhatsAppService $whatsappService,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        // Una sola corrida a la vez: el cron programado y el disparo manual (POST /reminders/trigger)
        // leen las mismas citas sin marcar y, si coinciden, le escriben dos veces a la misma clienta.
        $lock = Cache::lock('reminders:generate', 900);
        if (!$lock->get()) {
            $this->warn('[reminders:generate] Ya hay una corrida en curso; se omite esta.');

            return self::SUCCESS;
        }

        try {
            return $this->generate();
        } finally {
            $lock->release();
        }
    }

    private function generate(): int
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

                $label = $this->formatOffsetLabel($offsetHours);

                // Una visita con varios servicios son varias filas de Appointment que comparten
                // group_id (mismo patrón usado en solapamiento de horarios y comisiones) — sin
                // agrupar aquí, cada servicio generaba su propio recordatorio duplicado.
                $groups = $appointments->groupBy(fn (Appointment $appt) => $appt->group_id ?? $appt->id);

                foreach ($groups as $groupAppointments) {
                    $first = $groupAppointments->first();
                    $client = $first->client;
                    $serviceNames = $groupAppointments->pluck('service.name')->filter()->unique()->values();
                    if (!$client || $serviceNames->isEmpty()) {
                        \Illuminate\Support\Facades\Log::warning("[reminders:generate] {$offsetHours}h: Skipping appointment group ({$first->id}) — missing client or service");
                        continue;
                    }
                    $serviceLabel = $serviceNames->implode(', ');

                    $notifications = [];

                    $baseData = [
                        'business_id' => $first->business_id,
                        'branch_id' => $first->branch_id,
                        'appointment_id' => $first->id,
                        'type' => 'reminder',
                        'title' => "Recordatorio de cita ({$label})",
                        'message' => "El cliente {$client->full_name} tiene cita de {$serviceLabel}",
                        'client_name' => $client->full_name,
                        'client_phone' => $client->phone,
                        'service_name' => $serviceLabel,
                        'appointment_time' => $first->start_time,
                        'metadata' => [
                            'type' => 'reminder_offset',
                            'offset_hours' => $offsetHours,
                            'whatsapp_link' => $this->whatsappService->generateWhatsAppLink($client->phone),
                        ],
                    ];

                    $employeeIds = $groupAppointments->pluck('employee_id')->filter()->unique();
                    foreach ($employeeIds as $employeeId) {
                        $notifications[] = array_merge($baseData, [
                            'profile_id' => $employeeId,
                        ]);
                    }

                    $admins = $this->getAdminsToNotify($first->business_id, $first->branch_id);

                    foreach ($admins as $admin) {
                        if ($employeeIds->contains($admin->id)) {
                            continue;
                        }
                        $notifications[] = array_merge($baseData, [
                            'profile_id' => $admin->id,
                        ]);
                    }

                    $totalGenerated += $this->notificationService->createMany($notifications)->count();

                    foreach ($groupAppointments as $appt) {
                        $appt->reminders_sent = array_merge($appt->reminders_sent ?? [], [$offsetHours]);
                        $appt->save();
                    }

                    $affectedBusinesses[$first->business_id] = true;
                }
            }
        }

        $this->info("[reminders:generate] {$totalGenerated} reminder notifications generated.");

        // 2. Send WhatsApp messages for every active reminder/follow-up template a business has
        // configured — independent of the internal bell notifications above, since a business can
        // run several WhatsApp templates at once (24h before, 1h before, 2h after service ends...).
        $this->info('[reminders:generate] Checking WhatsApp reminder/follow-up templates...');

        $templatesByBusiness = MessageTemplate::whereIn('type', ['appointment_reminder', 'follow_up'])
            ->where('is_active', true)
            ->whereNotNull('offset_hours')
            ->get()
            ->groupBy('business_id');

        foreach ($templatesByBusiness as $businessId => $businessTemplates) {
            $business = $reminderBusinesses->firstWhere('id', $businessId) ?? Business::find($businessId);
            if (!$business || !$business->active || !$business->whatsapp_enabled) {
                continue;
            }
            // Whether there's actually a connected instance to send through (the business's
            // shared default, or a specific branch's own number) is resolved per-appointment
            // inside sendWhatsAppForTemplate, since a multi-branch business might have some
            // branches connected and others not.

            $features = $business->features ?? [];
            if (!($features['whatsapp_available'] ?? false) || !($features['whatsapp_reminders_enabled'] ?? true)) {
                continue;
            }

            foreach ($businessTemplates as $template) {
                $this->sendWhatsAppForTemplate($business, $template, $now, $whatsappBizIds, $whatsappSent);
            }
        }

        $this->info("[reminders:generate] {$whatsappSent} WhatsApp messages sent.");

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
                // Borra los avisos viejos de este negocio (todas las sucursales) antes de
                // recrearlos frescos por sucursal abajo -- evita acumular duplicados de una
                // corrida a otra.
                \App\Models\Notification::where('business_id', $bizId)
                    ->where('type', 'low_stock')
                    ->delete();

                // Un producto puede estar bajo en la Sucursal A y bien en la B (cada fila de
                // inventory_stock ya es por sucursal) -- agrupar tambien por branch_id para que
                // el encargado de cada sucursal solo se entere de LO SUYO. El admin sigue
                // viendolo todo: getAdminsToNotify() siempre incluye admin/superadmin sin
                // importar el branchId, asi que recibe un aviso por cada sucursal con stock bajo.
                $byBranch = $stocks->groupBy(fn ($s) => $s->branch_id ?? '');

                foreach ($byBranch as $branchId => $branchStocks) {
                    $branchId = $branchId ?: null;
                    $names = $branchStocks->pluck('product.name')->unique()->take(5)->toArray();
                    $count = $branchStocks->pluck('product.id')->unique()->count();
                    $remaining = $count - 5;
                    $extra = $count > 5 ? " y {$remaining} más" : '';

                    $admins = $this->getAdminsToNotify($bizId, $branchId);

                    $lowStockRows = [];
                    foreach ($admins as $admin) {
                        $lowStockRows[] = [
                            'business_id' => $bizId,
                            'branch_id' => $branchId,
                            'profile_id' => $admin->id,
                            'type' => 'low_stock',
                            'title' => 'Stock bajo',
                            'message' => "{$count} producto(s) con stock bajo: " . implode(', ', $names) . $extra,
                            'metadata' => ['product_count' => $count],
                        ];
                    }
                    $lowStockGenerated += $this->notificationService->createMany($lowStockRows)->count();
                }

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

    /**
     * Fires one WhatsApp template for whichever appointments currently fall in its window.
     * `appointment_reminder` counts back from `start_time` (fires N hours BEFORE the visit);
     * `follow_up` counts forward from `end_time` (fires N hours AFTER the service was scheduled
     * to finish — e.g. "ven a recoger a tu perro"). Every appointment tracks which *templates*
     * (not raw hour offsets, since several templates can share an offset) already fired for it in
     * its own `reminders_sent`, prefixed so it can't collide with the bell-notification offsets
     * also stored there.
     */
    private function sendWhatsAppForTemplate(Business $business, MessageTemplate $template, $now, array &$whatsappBizIds, int &$whatsappSent): void
    {
        $offsetHours = (float) $template->offset_hours;
        if ($offsetHours < 0 || $offsetHours > 720) {
            return;
        }

        $isFollowUp = $template->type === 'follow_up';
        $dateColumn = $isFollowUp ? 'end_time' : 'start_time';
        $anchor = $isFollowUp
            ? $now->copy()->subMinutes($offsetHours * 60)
            : $now->copy()->addMinutes($offsetHours * 60);
        $toleranceMinutes = max(10, (int) round($offsetHours * 60 * 0.1));
        // El 10% sirve para avisos de horas, pero en un seguimiento de 18 días serían ±43 h: el
        // mensaje saldría un día y medio antes o después de lo configurado.
        if ($isFollowUp) {
            $toleranceMinutes = min($toleranceMinutes, self::FOLLOW_UP_MAX_TOLERANCE_MINUTES);
        }
        $windowStart = $anchor->copy()->subMinutes($toleranceMinutes);
        $windowEnd = $anchor->copy()->addMinutes($toleranceMinutes);
        $sentMarker = "wa:{$template->id}";

        // La ventana solo sirve para DESCUBRIR visitas. Qué visita es, si ya se le escribió y si le
        // toca ahora se decide con la visita COMPLETA (abajo), no con las citas sueltas que caen en
        // la ventana: antes, cada servicio de una visita entraba a la ventana por su cuenta (sus
        // horas de fin/inicio difieren) y la clienta recibía un mensaje por cada uno, uno tras otro.
        $candidates = Appointment::with(['client', 'service'])
            ->where('business_id', $business->id)
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->whereBetween($dateColumn, [$windowStart, $windowEnd])
            ->get();

        if ($candidates->isEmpty()) {
            return;
        }

        $visits = $this->visitsOf($business->id, $candidates, $business->timezone ?: 'America/Caracas');
        $laterByClient = $isFollowUp ? $this->laterAppointments($business->id, $visits) : [];

        foreach ($visits as $visit) {
            // Por hora: la fecha y hora del mensaje son las de la primera cita de la visita.
            $visit = $visit->sortBy('start_time')->values();
            $first = $visit->first();

            // Ya se le mandó a esta visita (a cualquiera de sus citas, estén o no en la ventana).
            if ($visit->contains(fn (Appointment $a) => in_array($sentMarker, $a->reminders_sent ?? [], true))) {
                $this->markVisit($visit, $sentMarker);
                continue;
            }

            // Hora de referencia de la VISITA: el recordatorio cuenta desde que EMPIEZA su primera
            // cita; el seguimiento, desde que TERMINA la última. Mientras esa hora no caiga en la
            // ventana no se manda ni se marca nada.
            $anchorAt = $isFollowUp ? $visit->max('end_time') : $visit->min('start_time');
            if ($anchorAt->lt($windowStart) || $anchorAt->gt($windowEnd)) {
                continue;
            }

            // Seguimiento («¿te gustaría agendar tu próxima cita?»): no aplica si la clienta ya
            // volvió después de esta visita O ya tiene otra cita agendada (pasada o futura).
            $alreadyBooked = $isFollowUp && $this->hasLaterAppointment($visit, $laterByClient);

            if (!$alreadyBooked && $first->client && $first->client->phone) {
                $outcome = $this->whatsappService->sendReminderOutcome($first, $template->body, $visit);

                // El número de WhatsApp no estaba conectado: no se marca como enviado, así la
                // próxima corrida (cada 5 min) lo reintenta mientras la visita siga en su ventana.
                // Pasada la ventana ya no se envía: un recordatorio tardío confunde más de lo que ayuda.
                if ($outcome === WhatsAppService::OUTCOME_RETRY) {
                    continue;
                }

                if ($outcome === WhatsAppService::OUTCOME_SENT) {
                    $whatsappSent++;
                    $whatsappBizIds[$business->id] = true;
                }

                // Pausa entre envíos reales para no disparar ráfagas desde un mismo número
                // — WhatsApp marca como sospechoso un lote de mensajes salientes instantáneos.
                usleep(random_int(1_000_000, 3_000_000));
            }

            // Se marca TODA la visita (también sus citas fuera de la ventana), para que ninguna de
            // ellas vuelva a disparar el mensaje más tarde.
            $this->markVisit($visit, $sentMarker);
        }
    }

    /** @param  \Illuminate\Support\Collection<int, Appointment>  $visit */
    private function markVisit($visit, string $marker): void
    {
        foreach ($visit as $appt) {
            $sent = $appt->reminders_sent ?? [];
            if (!in_array($marker, $sent, true)) {
                $appt->reminders_sent = array_merge($sent, [$marker]);
                $appt->save();
            }
        }
    }

    /**
     * Agrupa las citas encontradas en VISITAS COMPLETAS, con todas sus citas aunque estén fuera de
     * la ventana: las que comparten `group_id` y las de la misma clienta el mismo día (hora del
     * negocio) — un servicio agendado por separado ese día es parte de la misma visita.
     *
     * @param  \Illuminate\Support\Collection<int, Appointment>  $candidates
     * @return \Illuminate\Support\Collection<int, \Illuminate\Support\Collection<int, Appointment>>
     */
    private function visitsOf(string $businessId, $candidates, string $timezone)
    {
        $clientIds = $candidates->pluck('client_id')->filter()->unique()->values();
        $groupIds = $candidates->pluck('group_id')->filter()->unique()->values();
        $dayStart = $candidates->min('start_time')->copy()->setTimezone($timezone)->startOfDay()->utc();
        $dayEnd = $candidates->max('start_time')->copy()->setTimezone($timezone)->endOfDay()->utc();

        $related = Appointment::with(['client', 'service'])
            ->where('business_id', $businessId)
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->where(function ($q) use ($clientIds, $groupIds, $dayStart, $dayEnd) {
                $q->whereIn('group_id', $groupIds)
                    ->orWhere(fn ($s) => $s->whereIn('client_id', $clientIds)->whereBetween('start_time', [$dayStart, $dayEnd]));
            })
            ->get();

        $pool = $candidates->keyBy('id')->union($related->keyBy('id'));

        // Unión de citas que pertenecen a la misma visita (por grupo o por clienta + día).
        $parent = [];
        $find = function (string $x) use (&$parent, &$find): string {
            $parent[$x] ??= $x;

            return $parent[$x] === $x ? $x : ($parent[$x] = $find($parent[$x]));
        };
        $firstOfKey = [];
        foreach ($pool as $id => $appt) {
            $find((string) $id);
            $keys = [];
            if ($appt->group_id) {
                $keys[] = 'g:' . $appt->group_id;
            }
            if ($appt->client_id) {
                $keys[] = 'c:' . $appt->client_id . ':' . $appt->start_time->copy()->setTimezone($timezone)->toDateString();
            }
            foreach ($keys as $key) {
                if (isset($firstOfKey[$key])) {
                    $parent[$find((string) $id)] = $find($firstOfKey[$key]);
                } else {
                    $firstOfKey[$key] = (string) $id;
                }
            }
        }

        $candidateIds = $candidates->pluck('id')->all();

        return $pool->groupBy(fn (Appointment $a) => $find((string) $a->id))
            ->filter(fn ($members) => $members->contains(fn (Appointment $a) => in_array($a->id, $candidateIds, true)))
            ->values();
    }

    /**
     * Citas posteriores (pasadas o FUTURAS, no canceladas ni inasistencias) de los clientes de
     * estas visitas. Una sola consulta para todos, en vez de una por cliente.
     *
     * @param  \Illuminate\Support\Collection<int, \Illuminate\Support\Collection<int, Appointment>>  $visits
     * @return array<string, array<int, array{id: string, start: \Illuminate\Support\Carbon}>>  por client_id
     */
    private function laterAppointments(string $businessId, $visits): array
    {
        $clientIds = $visits->map(fn ($v) => $v->first()->client_id)->filter()->unique()->values();
        if ($clientIds->isEmpty()) {
            return [];
        }

        $since = $visits->map(fn ($v) => $v->max('end_time'))->filter()->min();

        $later = [];
        $rows = Appointment::where('business_id', $businessId)
            ->whereIn('client_id', $clientIds)
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->where('start_time', '>=', $since)
            ->get(['id', 'client_id', 'start_time']);

        foreach ($rows as $row) {
            $later[$row->client_id][] = ['id' => (string) $row->id, 'start' => $row->start_time];
        }

        return $later;
    }

    /**
     * ¿La clienta de esta visita tiene OTRA cita después de que terminó? (ya volvió, o ya agendó).
     * Las citas de la propia visita no cuentan.
     *
     * @param  \Illuminate\Support\Collection<int, Appointment>  $visit
     * @param  array<string, array<int, array{id: string, start: \Illuminate\Support\Carbon}>>  $laterByClient
     */
    private function hasLaterAppointment($visit, array $laterByClient): bool
    {
        $clientId = $visit->first()->client_id;
        $visitEnd = $visit->max('end_time');
        if (!$clientId || !$visitEnd) {
            return false;
        }

        $ownIds = $visit->pluck('id')->map(fn ($id) => (string) $id)->all();

        foreach ($laterByClient[$clientId] ?? [] as $row) {
            if (!in_array($row['id'], $ownIds, true) && $row['start']->greaterThanOrEqualTo($visitEnd)) {
                return true;
            }
        }

        return false;
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
