<?php

namespace App\Http\Controllers\Api\Clinical;

use App\Events\EntityChanged;
use App\Http\Controllers\Api\Clinical\Concerns\ClinicalRecordAccess;
use App\Services\Clinical\IntakeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class IntakeController
{
    use ClinicalRecordAccess;

    public function __construct(private IntakeService $service)
    {
    }

    /**
     * Devuelve la historia del paciente, o 204 sin cuerpo si todavía no tiene una (el cliente HTTP
     * del frontend ya traduce 204 a `null`). No se usa `response()->json(null)`: Laravel lo
     * serializa como `{}`, indistinguible de una historia vacía.
     */
    public function show(Request $request, string $clientId): JsonResponse|Response
    {
        [$businessId, , $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;

        $intake = $this->service->findForClient($clientId, $businessId);

        if ($intake) {
            $this->audit($request, $businessId, $clientId, 'viewed', 'intake', $intake->id);
        }

        return $intake ? response()->json($intake) : response()->noContent();
    }

    public function upsert(Request $request, string $clientId): JsonResponse
    {
        [$businessId, $client, $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;

        $payload = $request->validate([
            'data' => ['required', 'array'],
        ]);

        $existed = $this->service->findForClient($clientId, $businessId) !== null;
        $intake = $this->service->upsert($clientId, $businessId, $client->branch_id, $payload['data'], $request->user()?->id);

        EntityChanged::safe($businessId, 'clinical_intake', $existed ? 'updated' : 'created', $intake->id);
        $this->audit($request, $businessId, $clientId, $existed ? 'updated' : 'created', 'intake', $intake->id);

        return response()->json($intake, $existed ? 200 : 201);
    }
}
