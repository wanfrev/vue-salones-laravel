<?php

namespace App\Http\Controllers\Api;

use App\Services\EmployeeScheduleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeScheduleController
{
    public function __construct(
        private EmployeeScheduleService $scheduleService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        if ($request->employee_id) {
            return response()->json($this->scheduleService->list($request->employee_id));
        }

        $user = $request->user()?->load('profile');
        $businessId = $user?->profile?->business_id;

        if ($businessId) {
            return response()->json($this->scheduleService->listByBusiness($businessId));
        }

        return response()->json([]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employee_id' => 'required|uuid',
            'branch_id' => 'nullable|uuid',
            'weekday' => 'required|integer|min:0|max:6',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i',
        ]);

        $schedule = $this->scheduleService->store($data);
        return response()->json($schedule, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'branch_id' => 'nullable|uuid',
            'weekday' => 'sometimes|integer|min:0|max:6',
            'start_time' => 'sometimes|date_format:H:i',
            'end_time' => 'sometimes|date_format:H:i',
        ]);

        $schedule = $this->scheduleService->update($id, $data);
        return response()->json($schedule);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->scheduleService->destroy($id);
        return response()->json(null, 204);
    }
}
