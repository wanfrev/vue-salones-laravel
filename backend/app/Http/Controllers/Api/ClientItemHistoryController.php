<?php

namespace App\Http\Controllers\Api;

use App\Services\ClientItemHistoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Clientas que compraron o se hicieron algo (producto o servicio), para filtrar el directorio de Clientes.
 * Solo lectura. Cruza ventas con clientas, así que va solo para administración y encargadas (`admin-panel`).
 */
class ClientItemHistoryController
{
    public function __construct(
        private ClientItemHistoryService $history,
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

    /** GET /clients/by-item?q=tinte — las clientas que compraron o se hicieron lo buscado en el último año. */
    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['message' => 'Sin negocio asignado.'], 403);
        }

        $data = $request->validate([
            // Con menos de 2 letras coincidiría casi todo: el filtro no se activa hasta tener 2.
            'q' => 'required|string|min:2|max:100',
            'branch_id' => 'nullable|uuid',
        ]);

        return response()->json($this->history->matches($businessId, $data, $this->history->resolveRange($businessId)));
    }
}
