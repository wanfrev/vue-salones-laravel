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

    public function index(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        return response()->json(
            $this->profileService->list($p->business_id, $request->branch_id)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) {
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
            'schedules' => 'nullable|array',
            'schedules.*.branch_id' => 'nullable|uuid',
            'schedules.*.weekday' => 'required|integer|min:0|max:6',
            'schedules.*.start_time' => 'required|date_format:H:i',
            'schedules.*.end_time' => 'required|date_format:H:i',
        ]);

        try {
            $profile = $this->profileService->store($data, $p->business_id);
            EntityChanged::dispatch($p->business_id, 'profile', 'created', $profile->id);
            return response()->json($profile, 201);
        } catch (\Throwable $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 500);
        }
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

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
            'active' => 'boolean',
            'schedules' => 'nullable|array',
            'schedules.*.branch_id' => 'nullable|uuid',
            'schedules.*.weekday' => 'required|integer|min:0|max:6',
            'schedules.*.start_time' => 'required|date_format:H:i',
            'schedules.*.end_time' => 'required|date_format:H:i',
        ]);

        $profile = $this->profileService->update($id, $data, $p?->business_id);
        EntityChanged::dispatch($p->business_id, 'profile', 'updated', $id);
        return response()->json($profile);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $this->profileService->destroy($id, $p?->business_id);
        EntityChanged::dispatch($p->business_id, 'profile', 'deleted', $id);
        return response()->json(null, 204);
    }
}
