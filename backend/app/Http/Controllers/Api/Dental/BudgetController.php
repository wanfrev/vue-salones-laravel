<?php

namespace App\Http\Controllers\Api\Dental;

use App\Events\EntityChanged;
use App\Models\Client;
use App\Services\Dental\BudgetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BudgetController
{
    public function __construct(private BudgetService $service)
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
            'items' => ['nullable', 'array'],
            'items.*.tooth' => ['nullable', 'integer'],
            'items.*.description' => ['required_with:items', 'string'],
            'items.*.service_id' => ['nullable', 'string'],
            'items.*.price' => ['required_with:items', 'numeric', 'min:0'],
            'items.*.included' => ['nullable', 'boolean'],
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

        $budget = $this->service->findForClient($id, $clientId, $businessId);
        if (!$budget) return response()->json(['message' => 'Presupuesto no encontrado.'], 404);

        return response()->json($budget);
    }

    public function store(Request $request, string $clientId): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['message' => 'No autorizado.'], 403);

        $client = $this->findClient($clientId, $businessId);
        if (!$client) return response()->json(['message' => 'Paciente no encontrado.'], 404);

        $data = $this->validatedSections($request);
        $budget = $this->service->create($clientId, $businessId, $client->branch_id, $data, $request->user()?->id);

        EntityChanged::safe($businessId, 'dental_budget', 'created', $budget->id);

        return response()->json($budget, 201);
    }

    public function update(Request $request, string $clientId, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['message' => 'No autorizado.'], 403);

        $budget = $this->service->findForClient($id, $clientId, $businessId);
        if (!$budget) return response()->json(['message' => 'Presupuesto no encontrado.'], 404);

        $data = $this->validatedSections($request);
        $budget = $this->service->update($budget, $data);

        EntityChanged::safe($businessId, 'dental_budget', 'updated', $budget->id);

        return response()->json($budget);
    }
}
