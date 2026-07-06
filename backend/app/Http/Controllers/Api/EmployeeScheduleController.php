<?php

namespace App\Http\Controllers\Api;

use App\Models\EmployeeSchedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeScheduleController
{
    /**
     * GET /api/employee-schedules?employee_id=
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate(['employee_id' => ['required', 'uuid']]);

        $schedule = EmployeeSchedule::where('employee_id', $request->employee_id)
            ->select('id', 'employee_id', 'branch_id', 'weekday', 'start_time', 'end_time')
            ->limit(1)
            ->first();

        return response()->json($schedule);
    }
}
