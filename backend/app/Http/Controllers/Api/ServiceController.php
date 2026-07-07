<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Services\ServiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceController
{
    public function __construct(
        private ServiceService $serviceService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json([]);

        return response()->json(
            $this->serviceService->list($p->business_id, $request->branch_id)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'duration_minutes' => 'required|integer|min:1',
            'price' => 'required|numeric|min:0',
            'local_percentage' => 'nullable|numeric|min:0|max:100',
            'color' => 'nullable|string|max:50',
            'category' => 'nullable|string|max:100',
            'icon' => 'nullable|string|max:50',
            'active' => 'boolean',
            'branch_id' => 'nullable|uuid',
            'service_category_id' => 'nullable|uuid',
        ]);

        $service = $this->serviceService->store($data, $p->business_id);
        EntityChanged::dispatch($p->business_id, 'service', 'created', $service->id);
        return response()->json($service, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'duration_minutes' => 'sometimes|integer|min:1',
            'price' => 'sometimes|numeric|min:0',
            'local_percentage' => 'nullable|numeric|min:0|max:100',
            'color' => 'nullable|string|max:50',
            'category' => 'nullable|string|max:100',
            'icon' => 'nullable|string|max:50',
            'active' => 'boolean',
            'branch_id' => 'nullable|uuid',
            'service_category_id' => 'nullable|uuid',
        ]);

        $service = $this->serviceService->update($id, $data, $p?->business_id);
        EntityChanged::dispatch($p->business_id, 'service', 'updated', $id);
        return response()->json($service);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $this->serviceService->destroy($id, $p?->business_id);
        EntityChanged::dispatch($p->business_id, 'service', 'deleted', $id);
        return response()->json(null, 204);
    }

    public function renameCategory(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'oldName' => 'required|string',
            'newName' => 'required|string',
        ]);

        $this->serviceService->renameCategory($p->business_id, $data['oldName'], $data['newName']);
        return response()->json(['success' => true]);
    }

    public function deleteCategory(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate(['categoryName' => 'required|string']);
        $this->serviceService->deleteCategory($p->business_id, $data['categoryName']);
        return response()->json(['success' => true]);
    }
}
