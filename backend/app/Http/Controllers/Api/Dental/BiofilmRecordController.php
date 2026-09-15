<?php

namespace App\Http\Controllers\Api\Dental;

use App\Events\EntityChanged;
use App\Models\Client;
use App\Services\Dental\BiofilmRecordService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BiofilmRecordController
{
    public function __construct(private BiofilmRecordService $service)
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
            'teeth' => ['nullable', 'array'],
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

        $record = $this->service->findForClient($id, $clientId, $businessId);
        if (!$record) return response()->json(['message' => 'Registro de biopelícula no encontrado.'], 404);

        return response()->json($record);
    }

    public function store(Request $request, string $clientId): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['message' => 'No autorizado.'], 403);

        $client = $this->findClient($clientId, $businessId);
        if (!$client) return response()->json(['message' => 'Paciente no encontrado.'], 404);

        $data = $this->validatedSections($request);
        $record = $this->service->create($clientId, $businessId, $client->branch_id, $data, $request->user()?->id);

        EntityChanged::safe($businessId, 'dental_biofilm_record', 'created', $record->id);

        return response()->json($record, 201);
    }

    public function update(Request $request, string $clientId, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['message' => 'No autorizado.'], 403);

        $record = $this->service->findForClient($id, $clientId, $businessId);
        if (!$record) return response()->json(['message' => 'Registro de biopelícula no encontrado.'], 404);

        $data = $this->validatedSections($request);
        $record = $this->service->update($record, $data);

        EntityChanged::safe($businessId, 'dental_biofilm_record', 'updated', $record->id);

        return response()->json($record);
    }
}
