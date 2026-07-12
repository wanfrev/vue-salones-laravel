<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Services\ProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController
{
    public function __construct(
        private ProfileService $profileService,
    ) {}

    private function resolveBusinessId(Request $request): ?string
    {
        return $request->user()?->profile?->business_id;
    }

    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json([]);
        }

        return response()->json(
            $this->profileService->list($businessId, $request->branch_id, $request->disable_agenda)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validate([
            'full_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'phone' => 'nullable|string|max:50',
            'job_title' => 'nullable|string|max:100',
            'pay_type' => 'required|in:salary,percentage,mixed',
            'pay_percentage' => 'nullable|numeric|min:0|max:100',
            'base_salary' => 'nullable|numeric|min:0',
            'salary_frequency' => 'nullable|in:weekly,biweekly,monthly',
            'disable_agenda' => 'boolean',
            'can_create_appointments' => 'boolean',
            'can_create_clients' => 'boolean',
            'branch_id' => 'nullable|uuid',
            'schedules' => 'nullable|array',
            'schedules.*.branch_id' => 'nullable|uuid',
            'schedules.*.weekday' => 'required|integer|min:0|max:6',
            'schedules.*.start_time' => 'required|date_format:H:i',
            'schedules.*.end_time' => 'required|date_format:H:i',
        ]);

        try {
            $profile = $this->profileService->store($data, $businessId);
            EntityChanged::safe($businessId, 'profile', 'created', $profile->id);
            return response()->json($profile, 201);
        } catch (\Throwable $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 500);
        }
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validate([
            'full_name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'password' => 'nullable|string|min:6',
            'phone' => 'nullable|string|max:50',
            'job_title' => 'nullable|string|max:100',
            'pay_type' => 'sometimes|in:salary,percentage,mixed',
            'pay_percentage' => 'nullable|numeric|min:0|max:100',
            'base_salary' => 'nullable|numeric|min:0',
            'salary_frequency' => 'nullable|in:weekly,biweekly,monthly',
            'disable_agenda' => 'boolean',
            'can_create_appointments' => 'boolean',
            'can_create_clients' => 'boolean',
            'active' => 'boolean',
            'branch_id' => 'nullable|uuid',
            'schedules' => 'nullable|array',
            'schedules.*.branch_id' => 'nullable|uuid',
            'schedules.*.weekday' => 'required|integer|min:0|max:6',
            'schedules.*.start_time' => 'required|date_format:H:i',
            'schedules.*.end_time' => 'required|date_format:H:i',
        ]);

        $profile = $this->profileService->update($id, $data, $businessId);
        EntityChanged::safe($businessId, 'profile', 'updated', $id);
        return response()->json($profile);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $profile = $this->profileService->findForBusiness($id, $this->resolveBusinessId($request) ?? '');
        return response()->json($profile);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $this->profileService->destroy($id, $businessId);
        EntityChanged::safe($businessId, 'profile', 'deleted', $id);
        return response()->json(null, 204);
    }
}
