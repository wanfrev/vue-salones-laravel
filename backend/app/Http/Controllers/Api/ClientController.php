<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Http\Requests\StoreClientRequest;
use App\Http\Requests\UpdateClientRequest;
use App\Services\ClientService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController
{
    public function __construct(
        private ClientService $clientService,
    ) {}

    private function resolveBusinessId(Request $request): ?string
    {
        return $request->user()?->profile?->business_id;
    }

    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json([]);

        return response()->json(
            $this->clientService->list($businessId, $request->branch_id)
        );
    }

    public function store(StoreClientRequest $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $client = $this->clientService->store($request->validated(), $businessId);
        EntityChanged::safe($businessId, 'client', 'created', $client->id);
        return response()->json($client, 201);
    }

    public function update(UpdateClientRequest $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $client = $this->clientService->update($id, $request->validated(), $businessId);
        EntityChanged::safe($businessId, 'client', 'updated', $id);
        return response()->json($client);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $this->clientService->destroy($id, $businessId);
        EntityChanged::safe($businessId, 'client', 'deleted', $id);
        return response()->json(null, 204);
    }

    public function search(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json([]);

        $request->validate(['q' => 'required|string|min:1']);
        return response()->json($this->clientService->search($businessId, $request->q, $request->branch_id));
    }

    public function findOrCreateByPhone(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'phone' => 'required|string|max:50',
            'full_name' => 'nullable|string|max:255',
            'email' => 'nullable|email',
            'branch_id' => 'nullable|uuid',
        ]);

        $client = $this->clientService->findOrCreateByPhone($businessId, $data['phone'], $data);
        return response()->json($client, $client->wasRecentlyCreated ? 201 : 200);
    }

    public function history(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json([]);

        return response()->json($this->clientService->getHistory($id, $businessId));
    }
}
