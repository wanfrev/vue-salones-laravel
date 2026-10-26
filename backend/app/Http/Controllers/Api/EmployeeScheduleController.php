<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Services\EmployeeScheduleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class EmployeeScheduleController
{
    public function __construct(
        private EmployeeScheduleService $scheduleService,
    ) {}

    private function resolveBusinessId(Request $request): ?string
    {
        $fromProfile = $request->user()?->profile?->business_id;
        if ($fromProfile) {
            return $fromProfile;
        }
        $raw = $request->query('business_id');
        if ($raw && preg_match('/eq\.(.+)/', $raw, $m)) {
            return $m[1];
        }
        return $raw ?: null;
    }

    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json([]);

        // `employee_id` (con o sin el prefijo `eq.` del cliente) acota a los horarios de esa persona.
        // Antes se ignoraba y se devolvían los de TODO el negocio: la app, al preguntar por los
        // horarios de una empleada, recibía los de otra y la ubicaba en la sucursal equivocada.
        $employeeId = $request->query('employee_id');
        if ($employeeId !== null) {
            $employeeId = is_string($employeeId) ? preg_replace('/^(eq)\./i', '', $employeeId) : null;
            // Un filtro inválido nunca debe convertirse en "todos".
            if (!$employeeId || !Str::isUuid($employeeId)) return response()->json([]);
        }

        return response()->json(
            $this->scheduleService->list($businessId, $employeeId)
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
            'break_start' => 'nullable|date_format:H:i',
            'break_end' => 'nullable|date_format:H:i',
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
            'break_start' => 'nullable|date_format:H:i',
            'break_end' => 'nullable|date_format:H:i',
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
