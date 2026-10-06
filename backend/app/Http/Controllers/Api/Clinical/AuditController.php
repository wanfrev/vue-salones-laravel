<?php

namespace App\Http\Controllers\Api\Clinical;

use App\Http\Controllers\Api\Clinical\Concerns\ClinicalRecordAccess;
use App\Services\Clinical\ClinicalAuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use InvalidArgumentException;

/**
 * Consulta de la bitácora de accesos al expediente clínico. Solo la lee el administrador del
 * negocio (ni siquiera el encargado): quien audita no debe ser quien opera. Los eventos de
 * lectura/escritura los anotan los propios controllers clínicos (ver ClinicalRecordAccess::audit).
 */
class AuditController
{
    use ClinicalRecordAccess;

    public function __construct(private ClinicalAuditService $service)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['message' => 'No autorizado.'], 403);

        $role = $request->user()?->profile?->role;
        if (!in_array($role, ['admin', 'superadmin'], true)) {
            return response()->json(['message' => 'Solo el administrador puede consultar la auditoría clínica.'], 403);
        }

        $filters = $request->validate([
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d'],
            'user_id' => ['nullable', 'uuid'],
            'client_id' => ['nullable', 'uuid'],
            'action' => ['nullable', Rule::in(ClinicalAuditService::ACTIONS)],
            'page' => ['nullable', 'integer', 'min:1', 'max:1000'],
        ]);

        try {
            return response()->json($this->service->list($businessId, $filters));
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
