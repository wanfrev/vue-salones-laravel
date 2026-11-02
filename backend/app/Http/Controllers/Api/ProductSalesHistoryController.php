<?php

namespace App\Http\Controllers\Api;

use App\Services\ProductSalesHistoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Historial de compras por producto (quién compró tinte, shampoo… y desde cuándo). Solo lectura: se protege con
 * el mismo permiso que el listado de productos (`perm:inventory`).
 */
class ProductSalesHistoryController
{
    public function __construct(
        private ProductSalesHistoryService $history,
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
            'product_id' => 'nullable|uuid',
            'branch_id' => 'nullable|uuid',
            'start' => 'nullable|date_format:Y-m-d',
            'end' => 'nullable|date_format:Y-m-d',
            'sort' => 'nullable|in:recent,units,name',
            'page' => 'nullable|integer|min:1|max:1000',
        ]);
    }

    /** GET /products/sales-history — compradoras del producto buscado, una fila por clienta. */
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

    /** GET /products/sales-history/client/{clientId} — las compras de una clienta (o `none`: ventas sin clienta). */
    public function clientSales(Request $request, string $clientId): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['message' => 'Sin negocio asignado.'], 403);
        }
        if ($clientId !== ProductSalesHistoryService::NO_CLIENT && !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $clientId)) {
            return response()->json(['message' => 'Clienta no válida.'], 422);
        }

        $data = $this->validated($request);

        try {
            $range = $this->history->resolveRange($businessId, $data['start'] ?? null, $data['end'] ?? null);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($this->history->clientSales($businessId, $clientId, $data, $range));
    }
}
