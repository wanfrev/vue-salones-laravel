<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Services\EmployeeScheduleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeScheduleController
{
    public function __construct(
        private EmployeeScheduleService $scheduleService,
    ) {}

    private function resolveBusinessId(Request $request): ?string
    {
        return $request->user()?->profile?->business_id;
    }

    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json([]);

        return response()->json(
            $this->scheduleService->list($businessId)
        );
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
            'weekday' => 'sometimes|integer|min:0|max:6',
            'start_time' => 'sometimes|date_format:H:i',
            'end_time' => 'sometimes|date_format:H:i',
            'branch_id' => 'nullable|uuid',
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
