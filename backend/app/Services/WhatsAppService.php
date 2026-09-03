<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Business;
use App\Models\MessageTemplate;
use App\Models\WhatsAppInstance;
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
        '{precio}' => 'appointment_price',
    ];

    /**
     * Resolve a template body with real values from an appointment.
     */
    public function resolveTemplate(string $body, Appointment $appointment, ?string $serviceNameOverride = null): string
    {
        $client = $appointment->client;
        $service = $appointment->service;
        $employee = $appointment->employeeProfile;
        $business = Business::find($appointment->business_id);
        $pet = $appointment->pet;

        $replacements = [
            '{cliente}' => $client->full_name ?? '',
            '{mascota}' => $pet->name ?? '',
            '{servicio}' => $serviceNameOverride ?? ($service->name ?? ''),
            '{fecha}' => $appointment->start_time->format('d/m/Y'),
            '{hora}' => $appointment->start_time->format('h:i A'),
            '{empleado}' => $employee->full_name ?? '',
            '{negocio}' => $business->name ?? '',
            '{precio}' => number_format($appointment->price_override ?? $service->price ?? 0, 2),
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
    public function sendReminder(Appointment $appointment, string $templateBody, ?string $serviceNameOverride = null): bool
    {
        $business = Business::find($appointment->business_id);
        if (!$business || !$business->whatsapp_enabled) {
            return false;
        }

        $client = $appointment->client;
        if (!$client || !$client->phone) {
            Log::warning("[WhatsApp] Cannot send reminder — client has no phone for appointment {$appointment->id}");
            return false;
        }

        $instance = $this->resolveSendingInstance($business->id, $appointment->branch_id);
        if (!$instance || !$instance->instance_id) {
            Log::warning("[WhatsApp] Business {$business->id} (branch {$appointment->branch_id}) has no WhatsApp instance configured");
            return false;
        }

        $message = $this->resolveTemplate($templateBody, $appointment, $serviceNameOverride);
        $number = $this->sanitizePhone($client->phone);

        return $this->sendText($business, $instance, $number, $message);
    }

    /**
     * Send the business's active "appointment_confirmation" template right when a booking is
     * created. Unlike reminder/follow_up (which fire from the reminders:generate cron on their
     * own offset), confirmation has no offset — it's tied to the booking event itself, so the
     * caller (AppointmentController) invokes this directly after creating the appointment.
     * Configurable per business the same way as every other template: no active
     * appointment_confirmation template (or the business/feature toggle off) just means nothing
     * sends — same silent-no-op contract as sendReminder.
     */
    public function sendConfirmation(Appointment $appointment): bool
    {
        $business = Business::find($appointment->business_id);
        if (!$business || !$business->whatsapp_enabled) {
            return false;
        }

        $features = is_array($business->features) ? $business->features : json_decode($business->features ?? '[]', true);
        if (!($features['whatsapp_available'] ?? false)) {
            return false;
        }

        $template = MessageTemplate::where('business_id', $business->id)
            ->where('type', 'appointment_confirmation')
            ->where('is_active', true)
            ->first();

        if (!$template) {
            return false;
        }

        return $this->sendReminder($appointment, $template->body);
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
            $response = Http::withHeaders(['apikey' => $apiKey])
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
            $response = Http::withHeaders(['apikey' => $apiKey])
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
            $response = Http::withHeaders(['apikey' => $apiKey])
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
            $response = Http::withHeaders(['apikey' => $apiKey])
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
            $response = Http::withHeaders(['apikey' => $apiKey])
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
            $response = Http::withHeaders(['apikey' => $apiKey])
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
