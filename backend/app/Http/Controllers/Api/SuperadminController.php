<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\CreateBusinessRequest;
use App\Http\Resources\BusinessResource;
use App\Rules\AssignableNiche;
use App\Services\BusinessService;
use App\Services\SuperadminService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SuperadminController
{
    public function __construct(
        private SuperadminService $superadminService,
        private BusinessService $businessService,
    ) {}

    public function businesses(): JsonResponse
    {
        return response()->json(
            BusinessResource::collection($this->superadminService->businesses())
        );
    }

    public function store(CreateBusinessRequest $request): JsonResponse
    {
        try {
            $result = $this->superadminService->store($request->validated());

            $business = \App\Models\Business::find($result['businessId']);

            return response()->json([
                'business' => new BusinessResource($business),
                'invitedUserId' => $result['userId'],
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => ['message' => $e->getMessage()],
            ], $e->getCode() === 422 ? 422 : 500);
        }
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:500'],
            'timezone' => ['sometimes', 'string'],
            'currency' => ['sometimes', 'string'],
            'niche_type' => ['sometimes', 'string', new AssignableNiche($id)],
            'active' => ['sometimes', 'boolean'],
            'ves_exchange_rate' => ['nullable', 'numeric', 'min:0'],
            'multi_branch_enabled' => ['sometimes', 'boolean'],
            'features' => ['nullable', 'array'],
        ]);

        $business = $this->superadminService->update($id, $validated);
        return response()->json(new BusinessResource($business));
    }

    public function destroy(string $id): JsonResponse
    {
        $this->superadminService->destroy($id);
        return response()->json(null, 204);
    }

    public function suspend(string $id): JsonResponse
    {
        $this->superadminService->suspend($id);
        return response()->json(['success' => true]);
    }

    public function resume(string $id): JsonResponse
    {
        $this->superadminService->resume($id);
        return response()->json(['success' => true]);
    }

    public function admins(string $id): JsonResponse
    {
        return response()->json($this->superadminService->admins($id));
    }

    public function resetAdminPassword(Request $request, string $id, string $profileId): JsonResponse
    {
        $validated = $request->validate([
            'password' => ['required', 'string', 'min:6', 'max:72'],
        ]);

        try {
            $profile = $this->superadminService->resetAdminPassword($id, $profileId, $validated['password']);

            \Illuminate\Support\Facades\Log::info('superadmin.admin_password_reset', [
                'business_id' => $id,
                'target_profile_id' => $profileId,
                'actor_id' => $request->user()?->id,
            ]);

            return response()->json([
                'success' => true,
                'id' => $profile->id,
            ]);
        } catch (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 404);
        } catch (\Throwable $e) {
            return response()->json(['error' => ['message' => 'No fue posible cambiar la contraseña.']], 500);
        }
    }
}
