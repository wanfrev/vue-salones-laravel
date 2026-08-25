<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\MessageTemplate;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WhatsAppController extends Controller
{
    public function __construct(
        private WhatsAppService $whatsappService,
    ) {}

    private function resolveBusinessId(Request $request): ?string
    {
        $fromProfile = $request->user()?->profile?->business_id;
        if ($fromProfile) {
            return $fromProfile;
        }
        $raw = $request->query('business_id');
        if ($raw && preg_match('/eq\.(.+)/', $raw, $m)) {
            return $m[1];
        }
        return $raw ?: null;
    }

    private function resolveBusiness(Request $request): Business
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            abort(403, 'Sin negocio asignado.');
        }
        $business = Business::findOrFail($businessId);

        $features = is_array($business->features) ? $business->features : json_decode($business->features ?? '[]', true);
        if (!($features['whatsapp_available'] ?? false)) {
            abort(403, 'WhatsApp no está disponible para este negocio.');
        }

        return $business;
    }

    /**
     * Get WhatsApp configuration for the business.
     */
    public function config(Request $request): JsonResponse
    {
        $business = $this->resolveBusiness($request);

        return response()->json([
            'whatsapp_enabled' => $business->whatsapp_enabled,
            'whatsapp_instance_id' => $business->whatsapp_instance_id,
            'whatsapp_instance_status' => $business->whatsapp_instance_status,
            'whatsapp_instance_number' => $business->whatsapp_instance_number,
            'whatsapp_base_url' => $business->whatsapp_base_url,
            'whatsapp_api_key' => $business->whatsapp_api_key ? '••••••••' : null,
        ]);
    }

    /**
     * Update WhatsApp configuration.
     */
    public function updateConfig(Request $request): JsonResponse
    {
        $business = $this->resolveBusiness($request);

        $data = $request->validate([
            'whatsapp_enabled' => ['boolean'],
            'whatsapp_base_url' => ['nullable', 'string', 'max:500'],
            'whatsapp_api_key' => ['nullable', 'string', 'max:255'],
            'whatsapp_instance_number' => ['nullable', 'string', 'max:20'],
        ]);

        if ($request->filled('whatsapp_api_key') && $request->whatsapp_api_key !== '••••••••') {
            $data['whatsapp_api_key'] = $request->whatsapp_api_key;
        } else {
            unset($data['whatsapp_api_key']);
        }

        $business->update($data);

        return response()->json(['message' => 'Configuración actualizada']);
    }

    /**
     * Create a new WhatsApp instance and get QR code.
     */
    public function createInstance(Request $request): JsonResponse
    {
        $business = $this->resolveBusiness($request);

        if (!$this->whatsappService->getBaseUrl($business)) {
            return response()->json(['message' => 'El servidor de WhatsApp no está configurado. Contacta al administrador.'], 422);
        }

        if ($business->whatsapp_instance_id) {
            return response()->json(['message' => 'Ya existe una instancia WhatsApp. Desconéctala primero.'], 422);
        }

        // Derivado del business_id (único garantizado) — un solo servidor Evolution API
        // sirve a todos los negocios de todos los entornos, así que el nombre no puede
        // depender de texto libre del usuario o dos negocios podrían chocar.
        $instanceName = 'biz-' . $business->id;

        $success = $this->whatsappService->createInstance($business, $instanceName);

        if (!$success) {
            return response()->json(['message' => 'No se pudo crear la instancia'], 500);
        }

        $qr = $this->whatsappService->getQrCode($business);

        return response()->json([
            'message' => 'Instancia creada',
            'instance_id' => $business->whatsapp_instance_id,
            'qr_code' => $qr['qrcode'] ?? $qr['base64'] ?? null,
        ]);
    }

    /**
     * Get the current QR code for connection.
     */
    public function qrCode(Request $request): JsonResponse
    {
        $business = $this->resolveBusiness($request);

        if (!$business->whatsapp_instance_id) {
            return response()->json(['message' => 'No hay instancia configurada'], 404);
        }

        $qr = $this->whatsappService->getQrCode($business);

        return response()->json([
            'qr_code' => $qr['qrcode'] ?? $qr['base64'] ?? null,
        ]);
    }

    /**
     * Check instance connection status.
     */
    public function status(Request $request): JsonResponse
    {
        $business = $this->resolveBusiness($request);

        if (!$business->whatsapp_instance_id) {
            return response()->json(['status' => 'disconnected']);
        }

        $status = $this->whatsappService->checkInstanceStatus($business);

        if ($status && $status !== $business->whatsapp_instance_status) {
            $business->update(['whatsapp_instance_status' => $status]);
        }

        return response()->json(['status' => $status]);
    }

    /**
     * Disconnect the WhatsApp instance.
     */
    public function disconnect(Request $request): JsonResponse
    {
        $business = $this->resolveBusiness($request);

        $this->whatsappService->disconnectInstance($business);

        $business->update([
            'whatsapp_instance_id' => null,
            'whatsapp_instance_status' => 'disconnected',
            'whatsapp_instance_number' => null,
        ]);

        return response()->json(['message' => 'Instancia desconectada']);
    }

    /**
     * Send a test message.
     */
    public function sendTest(Request $request): JsonResponse
    {
        $business = $this->resolveBusiness($request);

        $data = $request->validate([
            'number' => ['required', 'string', 'max:20'],
            'text' => ['required', 'string', 'max:1000'],
        ]);

        if (!$business->whatsapp_enabled || !$business->whatsapp_instance_id) {
            return response()->json(['message' => 'WhatsApp no está configurado'], 422);
        }

        $success = $this->whatsappService->sendText($business, $data['number'], $data['text']);

        if (!$success) {
            return response()->json(['message' => 'Error al enviar el mensaje'], 500);
        }

        return response()->json(['message' => 'Mensaje enviado correctamente']);
    }

    /**
     * List message templates.
     */
    public function templates(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);

        $templates = MessageTemplate::where('business_id', $businessId)
            ->orderBy('type')
            ->orderBy('name')
            ->get();

        // Primera vez que un negocio con WhatsApp habilitado abre esta pantalla y no
        // tiene ninguna plantilla: le dejamos una lista para usar, no una pantalla vacía.
        if ($templates->isEmpty()) {
            $business = Business::find($businessId);
            $features = is_array($business?->features) ? $business->features : json_decode($business?->features ?? '[]', true);
            if ($business && ($features['whatsapp_available'] ?? false)) {
                $default = MessageTemplate::create([
                    'business_id' => $businessId,
                    'type' => 'appointment_reminder',
                    'name' => 'Recordatorio de cita',
                    'body' => '¡Hola {cliente}! Te recordamos tu cita de {servicio} en {negocio} el {fecha} a las {hora}. ¡Te esperamos! 😊',
                    'is_active' => true,
                ]);
                $templates = collect([$default]);
            }
        }

        return response()->json($templates);
    }

    /**
     * Create or update a message template.
     */
    public function saveTemplate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id' => ['nullable', 'uuid'],
            'type' => ['required', 'string', 'in:appointment_reminder,appointment_confirmation,follow_up'],
            'name' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:5000'],
            'is_active' => ['boolean'],
        ]);

        $businessId = $this->resolveBusinessId($request);

        if (!empty($data['id'])) {
            $template = MessageTemplate::where('business_id', $businessId)
                ->findOrFail($data['id']);
            $template->update($data);
        } else {
            $data['business_id'] = $businessId;
            $template = MessageTemplate::create($data);
        }

        return response()->json($template);
    }

    /**
     * Delete a message template.
     */
    public function deleteTemplate(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);

        $template = MessageTemplate::where('business_id', $businessId)
            ->findOrFail($id);

        $template->delete();

        return response()->json(['message' => 'Plantilla eliminada']);
    }

    /**
     * Get available template variables.
     */
    public function variables(): JsonResponse
    {
        return response()->json([
            'variables' => [
                ['key' => '{cliente}', 'label' => 'Nombre del cliente'],
                ['key' => '{mascota}', 'label' => 'Nombre de la mascota'],
                ['key' => '{servicio}', 'label' => 'Nombre del servicio'],
                ['key' => '{fecha}', 'label' => 'Fecha de la cita'],
                ['key' => '{hora}', 'label' => 'Hora de la cita'],
                ['key' => '{empleado}', 'label' => 'Nombre del empleado'],
                ['key' => '{negocio}', 'label' => 'Nombre del negocio'],
                ['key' => '{precio}', 'label' => 'Precio del servicio'],
            ],
        ]);
    }
}
