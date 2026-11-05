<?php

namespace App\Http\Controllers\Api;

use App\Services\InventoryMovementHistoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Movimientos de inventario con filtros, totales y detalle. Solo lectura: mismo permiso que el listado de inventario
 * (`perm:inventory`). Es aparte de `InventoryController::movements`, que sigue sirviendo a lo que ya lo usaba.
 */
class InventoryMovementHistoryController
{
    public function __construct(
        private InventoryMovementHistoryService $history,
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

    /** GET /inventory/movement-history — movimientos filtrados y paginados, con totales y opciones de filtro. */
    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['message' => 'Sin negocio asignado.'], 403);
        }

        $data = $request->validate([
            'q' => 'nullable|string|max:100',
            'types' => 'nullable|string|max:200',
            'direction' => 'nullable|in:in,out',
            'product_id' => 'nullable|uuid',
            'category_id' => 'nullable|uuid',
            'user_id' => 'nullable|uuid',
            'branch_id' => 'nullable|uuid',
            'start' => 'nullable|date_format:Y-m-d',
            'end' => 'nullable|date_format:Y-m-d',
            'sort' => 'nullable|in:recent,oldest,quantity',
            'page' => 'nullable|integer|min:1|max:1000',
        ]);

        // «types» llega como lista separada por comas («sale,consumption»); solo valen los tipos conocidos.
        $types = array_values(array_filter(array_map('trim', explode(',', $data['types'] ?? ''))));
        if (array_diff($types, InventoryMovementHistoryService::TYPES)) {
            return response()->json(['message' => 'Tipo de movimiento no válido.'], 422);
        }
        $data['types'] = $types;

        try {
            $range = $this->history->resolveRange($businessId, $data['start'] ?? null, $data['end'] ?? null);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($this->history->list($businessId, $data, $range));
    }

    /** GET /inventory/movement-history/{id} — un movimiento con su origen y los demás de la misma operación. */
    public function show(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['message' => 'Sin negocio asignado.'], 403);
        }
        if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id)) {
            return response()->json(['message' => 'Movimiento no válido.'], 422);
        }

        $detail = $this->history->detail($businessId, $id);

        return $detail
            ? response()->json($detail)
            : response()->json(['message' => 'Movimiento no encontrado.'], 404);
    }
}
