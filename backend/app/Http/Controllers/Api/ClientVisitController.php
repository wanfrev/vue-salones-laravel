<?php

namespace App\Http\Controllers\Api;

use App\Services\ClientVisitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Historial de visitas de un cliente (citas + ventas directas del POS), paginado en el servidor. */
class ClientVisitController
{
    public function __construct(private ClientVisitService $visits) {}

    public function index(Request $request, string $clientId): JsonResponse
    {
        $profile = $request->user()?->profile;
        $businessId = $profile?->business_id;
        if (!$businessId) {
            return response()->json(['data' => [], 'meta' => ['page' => 1, 'per_page' => ClientVisitService::PER_PAGE, 'has_more' => false]]);
        }

        $validated = $request->validate([
            'page' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
        ]);

        // Las notas internas de la cita son del equipo de gestión: el empleado no las ve.
        $internalNotes = in_array($profile->role, ['admin', 'encargado', 'superadmin'], true);

        return response()->json($this->visits->page(
            $businessId,
            $clientId,
            (int) ($validated['page'] ?? 1),
            $validated['from'] ?? null,
            $validated['to'] ?? null,
            $internalNotes,
        ));
    }
}
