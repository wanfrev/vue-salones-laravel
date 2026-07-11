<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Http\Requests\StoreBranchRequest;
use App\Http\Resources\BranchResource;
use App\Models\Branch;
use App\Services\BranchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BranchController
{
    public function __construct(
        private BranchService $branchService,
    ) {}

    private function resolveBusinessId(Request $request): ?string
    {
        return $request->user()?->profile?->business_id;
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $profile = $user?->profile;

        if (!$profile || !$profile->business_id) {
            if ($profile?->role === 'superadmin' && $request->input('business_id')) {
                return response()->json(
                    BranchResource::collection($this->branchService->list($request->input('business_id')))
                );
            }
            return response()->json([], 200);
        }

        $overrideId = $request->input('business_id');
        $businessId = ($profile->role === 'superadmin' && $overrideId) ? $overrideId : $profile->business_id;

        return response()->json(
            BranchResource::collection($this->branchService->list($businessId))
        );
    }

    public function show(string $id): JsonResponse
    {
        $branch = Branch::find($id);
        if (!$branch) {
            return response()->json(['error' => ['message' => 'Sucursal no encontrada.']], 404);
        }
        return response()->json(new BranchResource($branch));
    }

    public function store(StoreBranchRequest $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        try {
            $branch = $this->branchService->store($request->validated(), $businessId);
            EntityChanged::safe($businessId, 'branch', 'created', $branch->id);
            return response()->json(new BranchResource($branch), 201);
        } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {
            return response()->json(['error' => ['message' => 'Ya existe una sucursal con ese nombre.']], 422);
        }
    }

    public function update(StoreBranchRequest $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $branch = $this->branchService->update($id, $request->validated(), $businessId);
        EntityChanged::safe($businessId, 'branch', 'updated', $id);
        return response()->json(new BranchResource($branch));
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $this->branchService->destroy($id, $businessId);
        EntityChanged::safe($businessId, 'branch', 'deleted', $id);
        return response()->json(null, 204);
    }
}
