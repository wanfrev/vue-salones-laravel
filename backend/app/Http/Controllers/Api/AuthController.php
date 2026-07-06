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

        return response()->json([
            'access_token' => $result['access_token'],
            'token_type' => $result['token_type'],
            'user' => new AuthResource($result['user']),
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

        return response()->json([
            'access_token' => $request->bearerToken(),
            'token_type' => 'Bearer',
            'user' => new AuthResource($user),
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
}
