<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Models\Service;
use App\Services\ServiceService;
use App\Support\PaginatesResults;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceController
{
    use PaginatesResults;
    public function __construct(
        private ServiceService $serviceService,
    ) {}

    private function resolveBusinessId(Request $request): ?string
    {
        return $request->user()?->profile?->business_id;
    }

    private function dispatchChange(?string $businessId, string $entity, string $action, ?string $entityId = null): void
    {
        if (!$businessId) return;
        try {
            EntityChanged::dispatch($businessId, $entity, $action, $entityId);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("EntityChanged dispatch failed: {$e->getMessage()}");
        }
    }

    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json([]);

        $query = Service::where('business_id', $businessId)->orderBy('name');
        if ($request->branch_id) {
            $query->where(function ($q) use ($request) {
                $q->whereNull('branch_id')->orWhere('branch_id', $request->branch_id);
            });
        }

        return response()->json($this->paginateQuery($query, $request));
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        $service = $this->serviceService->findForBusiness($id, $businessId);
        return response()->json($service);
    }

    public function store(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

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

        $service = $this->serviceService->store($data, $businessId);
        $this->dispatchChange($businessId, 'service', 'created', $service->id);
        return response()->json($service, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

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

        $service = $this->serviceService->update($id, $data, $businessId);
        $this->dispatchChange($businessId, 'service', 'updated', $id);
        return response()->json($service);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $this->serviceService->destroy($id, $businessId);
        $this->dispatchChange($businessId, 'service', 'deleted', $id);
        return response()->json(null, 204);
    }

    public function renameCategory(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'oldName' => 'required|string',
            'newName' => 'required|string',
        ]);

        $this->serviceService->renameCategory($businessId, $data['oldName'], $data['newName']);
        return response()->json(['success' => true]);
    }

    public function deleteCategory(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'categoryName' => 'required|string',
            'replacementCategory' => 'nullable|string',
        ]);
        $this->serviceService->deleteCategory(
            $businessId,
            $data['categoryName'],
            $data['replacementCategory'] ?? 'otros'
        );
        return response()->json(['success' => true]);
    }
}
