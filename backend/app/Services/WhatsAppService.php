<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Business;
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
    public function resolveTemplate(string $body, Appointment $appointment): string
    {
        $client = $appointment->client;
        $service = $appointment->service;
        $employee = $appointment->employeeProfile;
        $business = Business::find($appointment->business_id);
        $pet = $appointment->pet;

        $replacements = [
            '{cliente}' => $client->full_name ?? '',
            '{mascota}' => $pet->name ?? '',
            '{servicio}' => $service->name ?? '',
            '{fecha}' => $appointment->start_time->format('d/m/Y'),
            '{hora}' => $appointment->start_time->format('h:i A'),
            '{empleado}' => $employee->full_name ?? '',
            '{negocio}' => $business->name ?? '',
            '{precio}' => number_format($appointment->price_override ?? $service->price ?? 0, 2),
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $body);
    }

    /**
     * Get the WhatsApp server base URL for a business.
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
     * Get the instance ID for a business.
     */
    public function getInstanceId(Business $business): ?string
    {
        return $business->whatsapp_instance_id;
    }

    /**
     * Send a WhatsApp text message for an appointment reminder.
     */
    public function sendReminder(Appointment $appointment, string $templateBody): bool
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

        $message = $this->resolveTemplate($templateBody, $appointment);
        $number = $this->sanitizePhone($client->phone);

        return $this->sendText($business, $number, $message);
    }

    /**
     * Send a text message using the Evolution API-compatible endpoint.
     */
    public function sendText(Business $business, string $number, string $text): bool
    {
        $instance = $this->getInstanceId($business);
        $baseUrl = $this->getBaseUrl($business);
        $apiKey = $this->getApiKey($business);

        if (!$instance || !$baseUrl) {
            Log::warning("[WhatsApp] Business {$business->id} has no WhatsApp instance configured");
            return false;
        }

        try {
            $response = Http::withHeaders(['apikey' => $apiKey])
                ->post(rtrim($baseUrl, '/') . "/message/sendText/{$instance}", [
                    'number' => $number,
                    'text' => $text,
                ]);

            if ($response->successful()) {
                Log::info("[WhatsApp] Message sent to {$number} via instance {$instance}");
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
    public function getQrCode(Business $business): ?array
    {
        $instance = $this->getInstanceId($business);
        $baseUrl = $this->getBaseUrl($business);
        $apiKey = $this->getApiKey($business);

        if (!$instance || !$baseUrl) {
            return null;
        }

        try {
            $response = Http::withHeaders(['apikey' => $apiKey])
                ->get(rtrim($baseUrl, '/') . "/instance/connect/{$instance}");

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
    public function checkInstanceStatus(Business $business): ?string
    {
        $instance = $this->getInstanceId($business);
        $baseUrl = $this->getBaseUrl($business);
        $apiKey = $this->getApiKey($business);

        if (!$instance || !$baseUrl) {
            return 'disconnected';
        }

        try {
            $response = Http::withHeaders(['apikey' => $apiKey])
                ->get(rtrim($baseUrl, '/') . "/instance/connectionState/{$instance}");

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
     * Create a new WhatsApp instance.
     */
    public function createInstance(Business $business, string $instanceName): bool
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
                    'token' => $apiKey ?? '',
                    'qrcode' => true,
                ]);

            if ($response->successful()) {
                $data = $response->json();
                $business->update([
                    'whatsapp_instance_id' => $data['instance']['instanceName'] ?? $instanceName,
                    'whatsapp_instance_status' => 'pending',
                ]);
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
    public function disconnectInstance(Business $business): bool
    {
        $instance = $this->getInstanceId($business);
        $baseUrl = $this->getBaseUrl($business);
        $apiKey = $this->getApiKey($business);

        if (!$instance || !$baseUrl) {
            return false;
        }

        try {
            $response = Http::withHeaders(['apikey' => $apiKey])
                ->delete(rtrim($baseUrl, '/') . "/instance/logout/{$instance}");

            if ($response->successful()) {
                $business->update([
                    'whatsapp_instance_status' => 'disconnected',
                ]);
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
