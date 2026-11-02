<?php

namespace App\Http\Controllers\Api;

use App\Services\ServiceHistoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Historial de servicios por servicio (a quién se le hizo keratina, balayage… y desde cuándo). Solo lectura. Lista
 * clientas con su teléfono, así que va solo para administración y encargadas (`admin-panel`), como la pantalla de
 * Servicios; un empleado común no la ve.
 */
class ServiceHistoryController
{
    public function __construct(
        private ServiceHistoryService $history,
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

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        return $request->validate([
            'q' => 'nullable|string|max:100',
            'service_id' => 'nullable|uuid',
            'branch_id' => 'nullable|uuid',
            'start' => 'nullable|date_format:Y-m-d',
            'end' => 'nullable|date_format:Y-m-d',
            'sort' => 'nullable|in:recent,times,name',
            'page' => 'nullable|integer|min:1|max:1000',
        ]);
    }

    /** GET /services/history — clientas a las que se les hizo el servicio buscado, una fila por clienta. */
    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['message' => 'Sin negocio asignado.'], 403);
        }

        $data = $this->validated($request);

        try {
            $range = $this->history->resolveRange($businessId, $data['start'] ?? null, $data['end'] ?? null);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($this->history->byClient($businessId, $data, $range));
    }

    /** GET /services/history/client/{clientId} — los servicios de una clienta (o `none`: citas sin clienta). */
    public function clientServices(Request $request, string $clientId): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['message' => 'Sin negocio asignado.'], 403);
        }
        if ($clientId !== ServiceHistoryService::NO_CLIENT && !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $clientId)) {
            return response()->json(['message' => 'Clienta no válida.'], 422);
        }

        $data = $this->validated($request);

        try {
            $range = $this->history->resolveRange($businessId, $data['start'] ?? null, $data['end'] ?? null);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($this->history->clientServices($businessId, $clientId, $data, $range));
    }
}
