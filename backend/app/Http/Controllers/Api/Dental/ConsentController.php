<?php

namespace App\Http\Controllers\Api\Dental;

use App\Events\EntityChanged;
use App\Models\Client;
use App\Services\Dental\ConsentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConsentController
{
    public function __construct(private ConsentService $service)
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

        $consent = $this->service->findForClient($id, $clientId, $businessId);
        if (!$consent) return response()->json(['message' => 'Consentimiento no encontrado.'], 404);

        return response()->json($consent);
    }

    public function store(Request $request, string $clientId): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['message' => 'No autorizado.'], 403);

        $client = $this->findClient($clientId, $businessId);
        if (!$client) return response()->json(['message' => 'Paciente no encontrado.'], 404);

        $data = $request->validate([
            'procedure_description' => ['required', 'string'],
            'risks_text' => ['required', 'string'],
            'signature_data' => ['required', 'string'],
        ]);

        $consent = $this->service->create($clientId, $businessId, $client->branch_id, $data, $request->user()?->id);

        EntityChanged::safe($businessId, 'dental_consent', 'created', $consent->id);

        return response()->json($consent, 201);
    }
}
