<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Http\Requests\StoreBranchRequest;
use App\Http\Resources\BranchResource;
use App\Services\BranchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BranchController
{
    public function __construct(
        private BranchService $branchService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $profile = $user?->profile;

        if (!$profile || !$profile->business_id) {
            return response()->json([], 200);
        }

        return response()->json(
            BranchResource::collection($this->branchService->list($profile->business_id))
        );
    }

    public function store(StoreBranchRequest $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $profile = $user?->profile;

        if (!$profile || !$profile->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $branch = $this->branchService->store($request->validated(), $profile->business_id);
        EntityChanged::dispatch($profile->business_id, 'branch', 'created', $branch->id);
        return response()->json(new BranchResource($branch), 201);
    }

    public function update(StoreBranchRequest $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $profile = $user?->profile;

        $branch = $this->branchService->update($id, $request->validated(), $profile?->business_id);
        EntityChanged::dispatch($profile->business_id, 'branch', 'updated', $id);
        return response()->json(new BranchResource($branch));
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $profile = $user?->profile;

        $this->branchService->destroy($id, $profile?->business_id);
        EntityChanged::dispatch($profile->business_id, 'branch', 'deleted', $id);
        return response()->json(null, 204);
    }
}
