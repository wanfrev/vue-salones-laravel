<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Branch;
use App\Models\Business;
use App\Models\MessageTemplate;
use App\Models\WhatsAppInstance;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    /**
     * Available template variables for substitution.
     */
    public const VARIABLES = [
        '{cliente}' => 'client_name',
        '{mascota}' => 'pet_name',
        '{servicio}' => 'service_name',
        '{fecha}' => 'appointment_date',
        '{hora}' => 'appointment_time',
        '{empleado}' => 'employee_name',
        '{negocio}' => 'business_name',
        '{sucursal}' => 'branch_name',
        '{precio}' => 'appointment_price',
    ];

    /** Segundos máximos de espera por el servidor de WhatsApp (conectar / respuesta completa). */
    private const CONNECT_TIMEOUT_SECONDS = 5;
    private const REQUEST_TIMEOUT_SECONDS = 10;

    /**
     * Cliente HTTP hacia Evolution API, con tiempo límite: sin él, un servidor lento dejaba
     * colgado hasta 30 s lo que lo llamara (guardar una cita, o la corrida del cron).
     */
    private function evolution(?string $apiKey): PendingRequest
    {
        return Http::withHeaders(['apikey' => $apiKey])
            ->connectTimeout(self::CONNECT_TIMEOUT_SECONDS)
            ->timeout(self::REQUEST_TIMEOUT_SECONDS);
    }

    /**
     * Resolve a template body with real values from an appointment.
     *
     * Una visita con varios servicios son varias citas (mismo group_id): pásalas todas en `$group`
     * para que {servicio}, {empleado} y {precio} describan la visita completa — servicios y
     * profesionales sin repetir, y el precio como suma — y {fecha}/{hora} sean los de la primera
     * cita. Sin `$group`, la visita es solo `$appointment`.
     *
     * @param  iterable<Appointment>|null  $group
     */
    public function resolveTemplate(string $body, Appointment $appointment, ?iterable $group = null): string
    {
        $visit = collect($group ?? [$appointment])->sortBy('start_time')->values();
        if ($visit->isEmpty()) {
            $visit = collect([$appointment]);
        }
        $first = $visit->first();

        $visit->each(fn (Appointment $appt) => $appt->loadMissing(['service', 'employeeProfile']));

        $client = $first->client;
        $business = Business::find($first->business_id);
        $pet = $first->pet;

        // start_time se guarda en UTC -- sin convertir a la zona horaria del negocio antes de
        // formatear, el mensaje mostraba la hora UTC cruda (p.ej. "03:05 PM" en vez de "11:05 AM"
        // para un negocio en Venezuela, UTC-4).
        $localStartTime = $first->start_time->copy()->setTimezone($business?->timezone ?: 'UTC');

        $services = $visit->map(fn (Appointment $a) => $a->service?->name)->filter()->unique()->implode(', ');
        $employees = $visit->map(fn (Appointment $a) => $a->employeeProfile?->full_name)->filter()->unique()->implode(', ');
        $price = $visit->sum(fn (Appointment $a) => (float) ($a->price_override ?? $a->service?->price ?? 0));

        // Sucursal de la cita; un negocio sin sucursales (o una cita sin sucursal) lleva el nombre
        // del negocio, para que «te esperamos en {sucursal}» nunca quede en blanco.
        $branchName = $first->branch_id ? Branch::find($first->branch_id)?->name : null;

        $replacements = [
            '{cliente}' => $client->full_name ?? '',
            '{mascota}' => $pet->name ?? '',
            '{servicio}' => $services,
            '{fecha}' => $localStartTime->format('d/m/Y'),
            '{hora}' => $localStartTime->format('h:i A'),
            '{empleado}' => $employees,
            '{negocio}' => $business->name ?? '',
            '{sucursal}' => $branchName ?: ($business->name ?? ''),
            '{precio}' => number_format($price, 2),
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $body);
    }

    /**
     * Get the WhatsApp server base URL for a business. One Evolution API server hosts every
     * instance for the business (each branch is just another instance on it), so this stays
     * business-level rather than per-branch.
     */
    public function getBaseUrl(Business $business): ?string
    {
        return $business->whatsapp_base_url ?: config('services.evolution.url');
    }

    /**
     * Get the API key for a business's WhatsApp server.
     */
    public function getApiKey(Business $business): ?string
    {
        return $business->whatsapp_api_key ?: config('services.evolution.api_key');
    }

    /**
     * The instance row for one exact (business, branch) pair — no fallback. `$branchId` null
     * means the business's shared/default instance. Use this for anything the admin is managing
     * directly (connect, QR, status, disconnect) — a branch they picked should never silently
     * show another branch's connection.
     */
    public function findInstance(string $businessId, ?string $branchId): ?WhatsAppInstance
    {
        return WhatsAppInstance::where('business_id', $businessId)
            ->where('branch_id', $branchId)
            ->first();
    }

    /**
     * The instance actually used to SEND for a given branch: that branch's own connected number
     * if it has one, otherwise the business's shared default. Use this when sending a message on
     * an appointment's behalf, never when the admin is managing a specific branch's connection.
     */
    public function resolveSendingInstance(string $businessId, ?string $branchId): ?WhatsAppInstance
    {
        if ($branchId) {
            $branchInstance = $this->findInstance($businessId, $branchId);
            if ($branchInstance?->instance_id) {
                return $branchInstance;
            }
        }

        return $this->findInstance($businessId, null);
    }

    /**
     * Send a WhatsApp text message for an appointment reminder — resolves whichever instance
     * (the appointment's own branch, or the shared default) is actually connected.
     */
    public function sendReminder(Appointment $appointment, string $templateBody, ?iterable $group = null): bool
    {
        return $this->sendReminderOutcome($appointment, $templateBody, $group) === self::OUTCOME_SENT;
    }

    /** El mensaje salió. */
    public const OUTCOME_SENT = 'sent';
    /** No salió porque el número de WhatsApp no está conectado (o no hay uno): vale la pena reintentar. */
    public const OUTCOME_RETRY = 'retry';
    /** No salió por una causa que reintentar no arregla (sin teléfono, número inválido, canal apagado...). */
    public const OUTCOME_FAILED = 'failed';

    /** Segundos que se recuerda que una instancia estaba caída, para no consultarla por cada mensaje. */
    private const DOWN_MEMO_SECONDS = 60;

    /** @var array<string, int> instance_id => timestamp hasta el que se la da por desconectada */
    private array $instanceDownUntil = [];

    /**
     * Igual que sendReminder pero distingue POR QUÉ no salió: si la instancia no estaba conectada
     * (caída del servidor de WhatsApp, número desvinculado, sucursal sin número) devuelve
     * OUTCOME_RETRY y el cron lo vuelve a intentar mientras la cita siga en su ventana; cualquier
     * otro fallo es definitivo. Un fallo con la instancia conectada no se reintenta a propósito:
     * podría haber salido igual y duplicarse.
     *
     * @param  iterable<Appointment>|null  $group
     */
    public function sendReminderOutcome(Appointment $appointment, string $templateBody, ?iterable $group = null): string
    {
        $business = Business::find($appointment->business_id);
        if (!$business || !$business->whatsapp_enabled) {
            return self::OUTCOME_FAILED;
        }

        $client = $appointment->client;
        if (!$client || !$client->phone) {
            Log::warning("[WhatsApp] Cannot send reminder — client has no phone for appointment {$appointment->id}");
            return self::OUTCOME_FAILED;
        }

        $instance = $this->resolveSendingInstance($business->id, $appointment->branch_id);
        if (!$instance || !$instance->instance_id) {
            Log::warning("[WhatsApp] Business {$business->id} (branch {$appointment->branch_id}) has no WhatsApp instance configured");
            return self::OUTCOME_RETRY;
        }

        if (($this->instanceDownUntil[$instance->instance_id] ?? 0) > time()) {
            return self::OUTCOME_RETRY;
        }

        $message = $this->resolveTemplate($templateBody, $appointment, $group);
        $number = $this->sanitizePhone($client->phone);

        if ($this->sendText($business, $instance, $number, $message)) {
            return self::OUTCOME_SENT;
        }

        // Falló: ¿es que el número no está conectado? Solo en ese caso se reintenta.
        if (!in_array($this->checkInstanceStatus($business, $instance), ['open', 'connected'], true)) {
            $this->instanceDownUntil[$instance->instance_id] = time() + self::DOWN_MEMO_SECONDS;
            Log::warning("[WhatsApp] Instance {$instance->instance_id} is not connected — reminder for appointment {$appointment->id} will be retried");
            return self::OUTCOME_RETRY;
        }

        return self::OUTCOME_FAILED;
    }

    /**
     * Send the business's active "appointment_confirmation" template right when a booking is
     * created. Unlike reminder/follow_up (which fire from the reminders:generate cron on their
     * own offset), confirmation has no offset — it's tied to the booking event itself, so the
     * caller (AppointmentController) invokes this directly after creating the appointment.
     * Configurable per business the same way as every other template: no active
     * appointment_confirmation template (or the business/feature toggle off) just means nothing
     * sends — same silent-no-op contract as sendReminder.
     *
     * Respeta el mismo interruptor `whatsapp_reminders_enabled` que el cron (apagarlo detiene los
     * mensajes automáticos, confirmación incluida). Si hubiera varias plantillas de confirmación
     * activas se usa siempre la más antigua, no una cualquiera. `$group`: las citas de la visita.
     *
     * @param  iterable<Appointment>|null  $group
     */
    public function sendConfirmation(Appointment $appointment, ?iterable $group = null): bool
    {
        $business = Business::find($appointment->business_id);
        if (!$business || !$business->whatsapp_enabled) {
            return false;
        }

        $features = is_array($business->features) ? $business->features : json_decode($business->features ?? '[]', true);
        if (!($features['whatsapp_available'] ?? false) || !($features['whatsapp_reminders_enabled'] ?? true)) {
            return false;
        }

        $template = MessageTemplate::where('business_id', $business->id)
            ->where('type', 'appointment_confirmation')
            ->where('is_active', true)
            ->orderBy('created_at')
            ->orderBy('id')
            ->first();

        if (!$template) {
            return false;
        }

        return $this->sendReminder($appointment, $template->body, $group);
    }

    /**
     * Send a text message using the Evolution API-compatible endpoint.
     */
    public function sendText(Business $business, WhatsAppInstance $instance, string $number, string $text): bool
    {
        $baseUrl = $this->getBaseUrl($business);
        $apiKey = $this->getApiKey($business);

        if (!$instance->instance_id || !$baseUrl) {
            Log::warning("[WhatsApp] Business {$business->id} has no WhatsApp instance configured");
            return false;
        }

        try {
            $response = $this->evolution($apiKey)
                ->post(rtrim($baseUrl, '/') . "/message/sendText/{$instance->instance_id}", [
                    'number' => $number,
                    'text' => $text,
                ]);

            if ($response->successful()) {
                Log::info("[WhatsApp] Message sent to {$number} via instance {$instance->instance_id}");
                return true;
            }

            Log::warning("[WhatsApp] Failed to send message: " . $response->body());
            return false;
        } catch (\Throwable $e) {
            Log::error("[WhatsApp] Error sending message: {$e->getMessage()}");
            return false;
        }
    }

    /**
     * Generate a QR code for WhatsApp Web connection.
     * Returns base64-encoded QR image or null on failure.
     */
    public function getQrCode(Business $business, WhatsAppInstance $instance): ?array
    {
        $baseUrl = $this->getBaseUrl($business);
        $apiKey = $this->getApiKey($business);

        if (!$instance->instance_id || !$baseUrl) {
            return null;
        }

        try {
            $response = $this->evolution($apiKey)
                ->get(rtrim($baseUrl, '/') . "/instance/connect/{$instance->instance_id}");

            if ($response->successful()) {
                return $response->json();
            }

            return null;
        } catch (\Throwable $e) {
            Log::error("[WhatsApp] Error fetching QR code: {$e->getMessage()}");
            return null;
        }
    }

    /**
     * Check the connection status of a WhatsApp instance.
     */
    public function checkInstanceStatus(Business $business, WhatsAppInstance $instance): ?string
    {
        $baseUrl = $this->getBaseUrl($business);
        $apiKey = $this->getApiKey($business);

        if (!$instance->instance_id || !$baseUrl) {
            return 'disconnected';
        }

        try {
            $response = $this->evolution($apiKey)
                ->get(rtrim($baseUrl, '/') . "/instance/connectionState/{$instance->instance_id}");

            if ($response->successful()) {
                $data = $response->json();
                $state = $data['state'] ?? $data['instance']['state'] ?? 'disconnected';
                return $state;
            }

            return 'disconnected';
        } catch (\Throwable $e) {
            Log::error("[WhatsApp] Error checking instance status: {$e->getMessage()}");
            return 'disconnected';
        }
    }

    /**
     * Best-effort lookup of the phone number now attached to a connected instance. Evolution API
     * doesn't return this from /instance/connectionState (state only, no owner info) — it's on
     * /instance/fetchInstances, as `ownerJid` ("<digits>@s.whatsapp.net"). Never throws; a missed
     * lookup just leaves instance_number unset until the next status check picks it up.
     */
    public function fetchInstanceNumber(Business $business, WhatsAppInstance $instance): ?string
    {
        $baseUrl = $this->getBaseUrl($business);
        $apiKey = $this->getApiKey($business);

        if (!$instance->instance_id || !$baseUrl) {
            return null;
        }

        try {
            $response = $this->evolution($apiKey)
                ->get(rtrim($baseUrl, '/') . '/instance/fetchInstances', [
                    'instanceName' => $instance->instance_id,
                ]);

            if (!$response->successful()) {
                return null;
            }

            $data = $response->json();
            // Evolution has returned this as either a bare array of instances or
            // {instance: {...}} depending on version — handle both shapes defensively.
            $entry = is_array($data) && array_is_list($data) ? ($data[0] ?? null) : $data;
            $ownerJid = $entry['ownerJid'] ?? $entry['owner'] ?? $entry['instance']['owner'] ?? null;

            if (!$ownerJid || !str_contains($ownerJid, '@')) {
                return null;
            }

            return explode('@', $ownerJid)[0] ?: null;
        } catch (\Throwable $e) {
            Log::error("[WhatsApp] Error fetching instance number: {$e->getMessage()}");
            return null;
        }
    }

    /**
     * Create a new WhatsApp instance and persist it onto `$instance` (already scoped to the
     * right business/branch by the caller).
     */
    public function createInstance(Business $business, WhatsAppInstance $instance, string $instanceName): bool
    {
        $baseUrl = $this->getBaseUrl($business);
        $apiKey = $this->getApiKey($business);

        if (!$baseUrl) {
            return false;
        }

        try {
            $response = $this->evolution($apiKey)
                ->post(rtrim($baseUrl, '/') . '/instance/create', [
                    'instanceName' => $instanceName,
                    'integration' => 'WHATSAPP-BAILEYS',
                    'token' => $apiKey ?? '',
                    'qrcode' => true,
                ]);

            if ($response->successful()) {
                $data = $response->json();
                $instance->instance_id = $data['instance']['instanceName'] ?? $instanceName;
                $instance->instance_status = 'pending';
                $instance->business_id = $business->id;
                $instance->save();
                return true;
            }

            // Evolution ya tiene una instancia con este nombre exacto — típicamente huérfana de un
            // logout anterior (que desconecta la sesión en Evolution pero no borra la instancia,
            // mientras que nuestro `disconnect` sí limpia instance_id localmente). El nombre es
            // determinístico por business/branch, así que si ya existe ahí es de este negocio: la
            // adoptamos en vez de fallar, y el caller sigue a getQrCode() para reconectarla.
            if ($response->status() === 403 && str_contains(strtolower($response->body()), 'already in use')) {
                $instance->instance_id = $instanceName;
                $instance->instance_status = 'pending';
                $instance->business_id = $business->id;
                $instance->save();
                return true;
            }

            Log::warning("[WhatsApp] Failed to create instance: " . $response->body());
            return false;
        } catch (\Throwable $e) {
            Log::error("[WhatsApp] Error creating instance: {$e->getMessage()}");
            return false;
        }
    }

    /**
     * Logout/disconnect a WhatsApp instance.
     */
    public function disconnectInstance(Business $business, WhatsAppInstance $instance): bool
    {
        $baseUrl = $this->getBaseUrl($business);
        $apiKey = $this->getApiKey($business);

        if (!$instance->instance_id || !$baseUrl) {
            return false;
        }

        try {
            $response = $this->evolution($apiKey)
                ->delete(rtrim($baseUrl, '/') . "/instance/logout/{$instance->instance_id}");

            if ($response->successful()) {
                $instance->update(['instance_status' => 'disconnected']);
                return true;
            }

            return false;
        } catch (\Throwable $e) {
            Log::error("[WhatsApp] Error disconnecting instance: {$e->getMessage()}");
            return false;
        }
    }

    /**
     * Generate a WhatsApp chat link for a phone number.
     * Returns a clickable link to start a conversation on WhatsApp.
     */
    public function generateWhatsAppLink(string $phone, string $message = ''): string
    {
        $number = $this->sanitizePhone($phone);
        $base = "https://wa.me/{$number}";

        if (!empty($message)) {
            $encoded = urlencode($message);
            return "{$base}?text={$encoded}";
        }

        return $base;
    }

    /**
     * Sanitize a phone number for WhatsApp (remove +, spaces, etc).
     */
    private function sanitizePhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone);
        return $digits;
    }
}
