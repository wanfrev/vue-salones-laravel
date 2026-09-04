<?php

namespace App\Http\Controllers\Api\Dental;

use App\Events\EntityChanged;
use App\Models\Client;
use App\Services\Dental\ClinicalHistoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClinicalHistoryController
{
    public function __construct(private ClinicalHistoryService $service)
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

    private function findClient(string $clientId, string $businessId): ?Client
    {
        return Client::where('business_id', $businessId)->find($clientId);
    }

    private function validatedSections(Request $request): array
    {
        return $request->validate([
            'anamnesis' => ['nullable', 'array'],
            'examen_fisico' => ['nullable', 'array'],
            'examenes_complementarios' => ['nullable', 'array'],
            'diagnostico' => ['nullable', 'array'],
            'certificado_veracidad' => ['nullable', 'boolean'],
            'observaciones_generales' => ['nullable', 'string'],
        ]);
    }

    public function index(Request $request, string $clientId): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['message' => 'No autorizado.'], 403);

        $client = $this->findClient($clientId, $businessId);
        if (!$client) return response()->json(['message' => 'Paciente no encontrado.'], 404);

        return response()->json($this->service->listForClient($clientId, $businessId));
    }

    public function show(Request $request, string $clientId, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['message' => 'No autorizado.'], 403);

        $history = $this->service->findForClient($id, $clientId, $businessId);
        if (!$history) return response()->json(['message' => 'Historia clínica no encontrada.'], 404);

        return response()->json($history);
    }

    public function store(Request $request, string $clientId): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['message' => 'No autorizado.'], 403);

        $client = $this->findClient($clientId, $businessId);
        if (!$client) return response()->json(['message' => 'Paciente no encontrado.'], 404);

        $data = $this->validatedSections($request);
        $history = $this->service->create($clientId, $businessId, $client->branch_id, $data, $request->user()?->id);

        EntityChanged::safe($businessId, 'dental_clinical_history', 'created', $history->id);

        return response()->json($history, 201);
    }

    public function update(Request $request, string $clientId, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['message' => 'No autorizado.'], 403);

        $history = $this->service->findForClient($id, $clientId, $businessId);
        if (!$history) return response()->json(['message' => 'Historia clínica no encontrada.'], 404);

        $data = $this->validatedSections($request);
        $history = $this->service->update($history, $data);

        EntityChanged::safe($businessId, 'dental_clinical_history', 'updated', $history->id);

        return response()->json($history);
    }
}
