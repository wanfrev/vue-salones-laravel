<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\CreateBusinessRequest;
use App\Http\Resources\AuthResource;
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
            $result = $this->superadminService->store($request->validated(), $request->user()->id);

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

        $business = $this->superadminService->update($id, $validated, $request->user()->id);
        return response()->json(new BusinessResource($business));
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->superadminService->destroy($id, $request->user()->id);
        return response()->json(null, 204);
    }

    public function suspend(Request $request, string $id): JsonResponse
    {
        $this->superadminService->suspend($id, $request->user()->id);
        return response()->json(['success' => true]);
    }

    public function resume(Request $request, string $id): JsonResponse
    {
        $this->superadminService->resume($id, $request->user()->id);
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
            $profile = $this->superadminService->resetAdminPassword(
                $id,
                $profileId,
                $validated['password'],
                $request->user()->id,
            );

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

    /**
     * Issues a short-lived token that logs the caller in AS the given business admin,
     * without touching the admin's password or their own active sessions. The frontend
     * swaps its bearer token for this one and stashes the superadmin's original token so
     * "volver a superadmin" can restore it without a fresh login.
     */
    public function impersonate(Request $request, string $id, string $profileId): JsonResponse
    {
        try {
            $result = $this->superadminService->impersonate($id, $profileId, $request->user()->id);

            return response()->json([
                'access_token' => $result['access_token'],
                'token_type' => $result['token_type'],
                'expires_at' => $result['expires_at'],
                'user' => new AuthResource($result['user']),
                'business' => $result['business'] ? new BusinessResource($result['business']) : null,
            ]);
        } catch (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 404);
        } catch (\Throwable $e) {
            $status = method_exists($e, 'getStatusCode') ? $e->getStatusCode() : 500;
            return response()->json(['error' => ['message' => $e->getMessage() ?: 'No fue posible iniciar la sesión de soporte.']], $status ?: 500);
        }
    }

    public function auditLogs(string $id): JsonResponse
    {
        return response()->json($this->superadminService->auditLogs($id));
    }

    /** Every superadmin action across every business — the "Auditoría" page, not the per-business tab. */
    public function globalAuditLogs(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'action' => ['nullable', 'string'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);

        return response()->json(
            $this->superadminService->auditLogs(
                null,
                $validated['action'] ?? null,
                $validated['limit'] ?? 100,
            )
        );
    }
}
