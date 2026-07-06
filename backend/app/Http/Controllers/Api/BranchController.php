<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreBranchRequest;
use App\Http\Resources\BranchResource;
use App\Models\Branch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BranchController
{
    /**
     * GET /api/branches
     * Scope: filtered by business_id from auth user's profile.
     * Superadmin: optional ?business_id= query param.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $profile = $user?->profile;

        if (!$profile || !$profile->business_id) {
            return response()->json([], 200);
        }

        $query = Branch::where('business_id', $profile->business_id)
            ->where('active', true)
            ->orderByDesc('is_default')
            ->orderBy('name');

        return response()->json(
            BranchResource::collection($query->get())
        );
    }

    /**
     * POST /api/branches
     */
    public function store(StoreBranchRequest $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $profile = $user?->profile;

        if (!$profile || !$profile->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validated();

        // If setting as default, unset others
        if (!empty($data['is_default'])) {
            Branch::where('business_id', $profile->business_id)
                ->update(['is_default' => false]);
        }

        $branch = Branch::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $profile->business_id,
            'name' => $data['name'],
            'address' => $data['address'] ?? null,
            'phone' => $data['phone'] ?? null,
            'is_default' => $data['is_default'] ?? false,
            'active' => true,
            'ves_exchange_rate' => $data['ves_exchange_rate'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(new BranchResource($branch), 201);
    }

    /**
     * PUT /api/branches/{id}
     */
    public function update(StoreBranchRequest $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $profile = $user?->profile;

        $branch = Branch::find($id);
        if (!$branch || $branch->business_id !== $profile?->business_id) {
            return response()->json(['error' => ['message' => 'Not found']], 404);
        }

        $data = $request->validated();

        if (!empty($data['is_default'])) {
            Branch::where('business_id', $profile->business_id)
                ->where('id', '!=', $id)
                ->update(['is_default' => false]);
        }

        $branch->update([
            'name' => $data['name'] ?? $branch->name,
            'address' => $data['address'] ?? $branch->address,
            'phone' => $data['phone'] ?? $branch->phone,
            'is_default' => $data['is_default'] ?? $branch->is_default,
            'active' => $data['active'] ?? $branch->active,
            'ves_exchange_rate' => $data['ves_exchange_rate'] ?? $branch->ves_exchange_rate,
            'updated_at' => now(),
        ]);

        return response()->json(new BranchResource($branch->fresh()));
    }

    /**
     * DELETE /api/branches/{id}  (soft delete: sets active=false)
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $profile = $user?->profile;

        $branch = Branch::find($id);
        if (!$branch || $branch->business_id !== $profile?->business_id) {
            return response()->json(['error' => ['message' => 'Not found']], 404);
        }

        $branch->update(['active' => false, 'updated_at' => now()]);

        return response()->json(null, 204);
    }
}
