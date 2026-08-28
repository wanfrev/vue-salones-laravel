<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\MessageTemplate;
use App\Models\WhatsAppInstance;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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

    /**
     * null = the business's shared/default instance. Distinct from "param absent" only in intent
     * (both resolve to null) — every caller here treats a missing branch_id the same as an
     * explicit one, unlike StaffingTimesheetController where the two states differ.
     */
    private function resolveBranchId(Request $request): ?string
    {
        $raw = $request->input('branch_id') ?? $request->query('branch_id');
        if (!$raw || $raw === 'null' || $raw === 'undefined') {
            return null;
        }
        return $raw;
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
     * Every WhatsApp instance the business has — the shared default plus one per branch that's
     * been connected. Lets the frontend render a row per sucursal instead of just one connection.
     */
    public function instances(Request $request): JsonResponse
    {
        $business = $this->resolveBusiness($request);

        $instances = WhatsAppInstance::with('branch:id,name')
            ->where('business_id', $business->id)
            ->get();

        $branches = $business->multi_branch_enabled
            ? $business->branches()->where('active', true)->orderBy('name')->get(['id', 'name'])
            : collect();

        return response()->json([
            'default' => $instances->firstWhere('branch_id', null),
            'branches' => $branches->map(function ($branch) use ($instances) {
                return [
                    'branch_id' => $branch->id,
                    'branch_name' => $branch->name,
                    'instance' => $instances->firstWhere('branch_id', $branch->id),
                ];
            }),
        ]);
    }

    /**
     * Get WhatsApp configuration for the business — whatsapp_enabled/base_url/api_key are
     * business-wide, the instance fields are scoped to whichever branch_id was requested (null =
     * the shared default instance).
     */
    public function config(Request $request): JsonResponse
    {
        $business = $this->resolveBusiness($request);
        $branchId = $this->resolveBranchId($request);
        $instance = $this->whatsappService->findInstance($business->id, $branchId);

        return response()->json([
            'whatsapp_enabled' => $business->whatsapp_enabled,
            'whatsapp_instance_id' => $instance?->instance_id,
            'whatsapp_instance_status' => $instance?->instance_status,
            'whatsapp_instance_number' => $instance?->instance_number,
            'whatsapp_base_url' => $business->whatsapp_base_url,
            'whatsapp_api_key' => $business->whatsapp_api_key ? '••••••••' : null,
        ]);
    }

    /**
     * Update WhatsApp configuration. Only the business-wide fields — the master on/off switch and
     * the shared Evolution server credentials. Per-branch state lives on WhatsAppInstance and is
     * only ever touched by createInstance/disconnect.
     */
    public function updateConfig(Request $request): JsonResponse
    {
        $business = $this->resolveBusiness($request);

        $data = $request->validate([
            'whatsapp_enabled' => ['boolean'],
            'whatsapp_base_url' => ['nullable', 'string', 'max:500'],
            'whatsapp_api_key' => ['nullable', 'string', 'max:255'],
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
     * Create a new WhatsApp instance and get QR code, for one branch (or the shared default).
     */
    public function createInstance(Request $request): JsonResponse
    {
        $business = $this->resolveBusiness($request);
        $branchId = $this->resolveBranchId($request);

        if (!$this->whatsappService->getBaseUrl($business)) {
            return response()->json(['message' => 'El servidor de WhatsApp no está configurado. Contacta al administrador.'], 422);
        }

        $instance = $this->whatsappService->findInstance($business->id, $branchId);
        if ($instance?->instance_id) {
            return response()->json(['message' => 'Ya existe una instancia WhatsApp para esta sucursal. Desconéctala primero.'], 422);
        }
        $instance ??= new WhatsAppInstance(['business_id' => $business->id, 'branch_id' => $branchId]);

        // Derivado del business_id (y branch_id si aplica) — un solo servidor Evolution API sirve
        // a todos los negocios de todos los entornos, así que el nombre no puede depender de
        // texto libre del usuario o dos instancias podrían chocar.
        $instanceName = $branchId ? "biz-{$business->id}-{$branchId}" : "biz-{$business->id}";

        $success = $this->whatsappService->createInstance($business, $instance, $instanceName);

        if (!$success) {
            return response()->json(['message' => 'No se pudo crear la instancia'], 500);
        }

        $qr = $this->whatsappService->getQrCode($business, $instance);

        return response()->json([
            'message' => 'Instancia creada',
            'instance_id' => $instance->instance_id,
            'qr_code' => $qr['qrcode'] ?? $qr['base64'] ?? null,
        ]);
    }

    /**
     * Get the current QR code for connection.
     */
    public function qrCode(Request $request): JsonResponse
    {
        $business = $this->resolveBusiness($request);
        $instance = $this->whatsappService->findInstance($business->id, $this->resolveBranchId($request));

        if (!$instance?->instance_id) {
            return response()->json(['message' => 'No hay instancia configurada'], 404);
        }

        $qr = $this->whatsappService->getQrCode($business, $instance);

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
        $instance = $this->whatsappService->findInstance($business->id, $this->resolveBranchId($request));

        if (!$instance?->instance_id) {
            return response()->json(['status' => 'disconnected']);
        }

        $status = $this->whatsappService->checkInstanceStatus($business, $instance);

        if ($status && $status !== $instance->instance_status) {
            $instance->update(['instance_status' => $status]);
        }

        return response()->json(['status' => $status]);
    }

    /**
     * Disconnect the WhatsApp instance.
     */
    public function disconnect(Request $request): JsonResponse
    {
        $business = $this->resolveBusiness($request);
        $instance = $this->whatsappService->findInstance($business->id, $this->resolveBranchId($request));

        if (!$instance) {
            return response()->json(['message' => 'Instancia desconectada']);
        }

        $this->whatsappService->disconnectInstance($business, $instance);

        $instance->update([
            'instance_id' => null,
            'instance_status' => 'disconnected',
            'instance_number' => null,
        ]);

        return response()->json(['message' => 'Instancia desconectada']);
    }

    /**
     * Send a test message.
     */
    public function sendTest(Request $request): JsonResponse
    {
        $business = $this->resolveBusiness($request);
        $instance = $this->whatsappService->findInstance($business->id, $this->resolveBranchId($request));

        $data = $request->validate([
            'number' => ['required', 'string', 'max:20'],
            'text' => ['required', 'string', 'max:1000'],
        ]);

        if (!$business->whatsapp_enabled || !$instance?->instance_id) {
            return response()->json(['message' => 'WhatsApp no está configurado'], 422);
        }

        $success = $this->whatsappService->sendText($business, $instance, $data['number'], $data['text']);

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
                    'offset_hours' => 24,
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
            // Required for reminder/follow_up — that's what tells the cron when to fire this
            // template. Meaningless for appointment_confirmation, which fires at booking time.
            'offset_hours' => [
                Rule::requiredIf(in_array($request->type, ['appointment_reminder', 'follow_up'], true)),
                'nullable', 'numeric', 'min:0', 'max:720',
            ],
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
