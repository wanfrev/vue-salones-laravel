<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Services\ClientService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController
{
    public function __construct(
        private ClientService $clientService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json([]);

        return response()->json(
            $this->clientService->list($p->business_id, $request->branch_id)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'full_name' => 'required|string|max:255',
            'phone' => 'required|string|max:50',
            'email' => 'nullable|email|max:255',
            'notes' => 'nullable|string',
            'birthday' => 'nullable|date',
            'branch_id' => 'nullable|uuid',
            'metadata' => 'nullable|array',
        ]);

        $client = $this->clientService->store($data, $p->business_id);
        EntityChanged::dispatch($p->business_id, 'client', 'created', $client->id);
        return response()->json($client, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $data = $request->validate([
            'full_name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|max:50',
            'email' => 'nullable|email|max:255',
            'notes' => 'nullable|string',
            'birthday' => 'nullable|date',
            'branch_id' => 'nullable|uuid',
            'metadata' => 'nullable|array',
        ]);

        $client = $this->clientService->update($id, $data, $p?->business_id);
        EntityChanged::dispatch($p->business_id, 'client', 'updated', $id);
        return response()->json($client);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $this->clientService->destroy($id, $p?->business_id);
        EntityChanged::dispatch($p->business_id, 'client', 'deleted', $id);
        return response()->json(null, 204);
    }

    public function search(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json([]);

        $request->validate(['q' => 'required|string|min:2']);
        return response()->json($this->clientService->search($p->business_id, $request->q));
    }

    public function findOrCreateByPhone(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'phone' => 'required|string|max:50',
            'full_name' => 'nullable|string|max:255',
            'email' => 'nullable|email',
            'branch_id' => 'nullable|uuid',
        ]);

        $client = $this->clientService->findOrCreateByPhone($p->business_id, $data['phone'], $data);
        return response()->json($client, $client->wasRecentlyCreated ? 201 : 200);
    }

    public function history(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json([]);

        return response()->json($this->clientService->getHistory($id, $p->business_id));
    }
}
