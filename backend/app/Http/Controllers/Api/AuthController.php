<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\LoginRequest;
use App\Http\Resources\AuthResource;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController
{
    public function __construct(private AuthService $authService) {}

    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->login(
            $request->validated('email'),
            $request->validated('password'),
        );

        $user = $result['user'];
        $profile = $user->profile;
        $business = null;

        if ($profile?->business_id) {
            $business = \App\Models\Business::find($profile->business_id);
        }

        return response()->json([
            'access_token' => $result['access_token'],
            'token_type' => $result['token_type'],
            'user' => new AuthResource($user),
            'business' => $business ? new \App\Http\Resources\BusinessResource($business) : null,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user());

        return response()->json(null, 204);
    }

    public function session(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');

        if (!$user) {
            return response()->json(['error' => ['message' => 'No autenticado.']], 401);
        }

        $profile = $user->profile;
        $business = null;

        if ($profile?->business_id) {
            $business = \App\Models\Business::find($profile->business_id);
        }

        return response()->json([
            'access_token' => $request->bearerToken(),
            'token_type' => 'Bearer',
            'user' => new AuthResource($user),
            'business' => $business ? new \App\Http\Resources\BusinessResource($business) : null,
        ]);
    }

    public function linkedBusinesses(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => ['message' => 'No autenticado.']], 401);
        }

        return response()->json($this->authService->linkedBusinesses($user));
    }

    public function switchBusiness(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => ['message' => 'No autenticado.']], 401);
        }

        $validated = $request->validate([
            'user_id' => ['required', 'uuid'],
        ]);

        try {
            $result = $this->authService->switchBusiness($user, $validated['user_id']);
        } catch (\Throwable $e) {
            $status = method_exists($e, 'getStatusCode') ? $e->getStatusCode() : 500;
            return response()->json(['error' => ['message' => $e->getMessage() ?: 'No fue posible cambiar de negocio.']], $status ?: 500);
        }

        $target = $result['user'];
        $profile = $target->profile;
        $business = $profile?->business_id ? \App\Models\Business::find($profile->business_id) : null;

        return response()->json([
            'access_token' => $result['access_token'],
            'token_type' => $result['token_type'],
            'user' => new AuthResource($target),
            'business' => $business ? new \App\Http\Resources\BusinessResource($business) : null,
        ]);
    }

    public function refresh(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => ['message' => 'No autenticado.']], 401);
        }

        $result = $this->authService->refresh($user);

        return response()->json([
            'access_token' => $result['access_token'],
            'token_type' => $result['token_type'],
            'user' => new AuthResource($result['user']),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6',
        ]);

        $this->authService->changePassword(
            $user,
            $validated['current_password'],
            $validated['new_password'],
        );

        return response()->json(['message' => 'Contraseña actualizada correctamente.']);
    }
}
