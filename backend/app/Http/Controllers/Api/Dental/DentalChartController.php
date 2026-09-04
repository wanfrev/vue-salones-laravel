<?php

namespace App\Http\Controllers\Api\Dental;

use App\Events\EntityChanged;
use App\Models\Client;
use App\Services\Dental\DentalChartService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DentalChartController
{
    public function __construct(private DentalChartService $service)
    {
    }

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

    private function findClient(Request $request, string $clientId, string $businessId): ?Client
    {
        return Client::where('business_id', $businessId)->find($clientId);
    }

    public function show(Request $request, string $clientId): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        $client = $this->findClient($request, $clientId, $businessId);
        if (!$client) {
            return response()->json(['message' => 'Paciente no encontrado.'], 404);
        }

        $chart = $this->service->getOrCreateForClient($clientId, $businessId, $client->branch_id);

        return response()->json($chart);
    }

    public function update(Request $request, string $clientId): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        $client = $this->findClient($request, $clientId, $businessId);
        if (!$client) {
            return response()->json(['message' => 'Paciente no encontrado.'], 404);
        }

        $data = $request->validate([
            'teeth' => ['required', 'array'],
        ]);

        $chart = $this->service->getOrCreateForClient($clientId, $businessId, $client->branch_id);
        $chart = $this->service->updateTeeth($chart, $data['teeth']);

        EntityChanged::safe($businessId, 'dental_chart', 'updated', $chart->id);

        return response()->json($chart);
    }
}
