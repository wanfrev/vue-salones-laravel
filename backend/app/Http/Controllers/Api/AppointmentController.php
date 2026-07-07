<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Services\AppointmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AppointmentController
{
    public function __construct(
        private AppointmentService $appointmentService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json([]);

        return response()->json(
            $this->appointmentService->list(
                $p->business_id,
                $request->start_date,
                $request->end_date,
                $request->employee_id,
                $request->branch_id,
                $request->status,
            )
        );
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'client_id' => 'required|uuid',
            'employee_id' => 'required|uuid',
            'service_id' => 'required|uuid',
            'assistant_employee_id' => 'nullable|uuid',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'status' => 'nullable|in:pending,confirmed,in_progress,completed,cancelled,no_show',
            'service_notes' => 'nullable|string',
            'internal_notes' => 'nullable|string',
            'source' => 'nullable|string',
            'group_id' => 'nullable|uuid',
            'price_override' => 'nullable|numeric|min:0',
            'employee_percentage_override' => 'nullable|numeric|min:0|max:100',
            'assistant_percentage' => 'nullable|numeric|min:0|max:100',
            'duration_override' => 'nullable|integer|min:1',
            'branch_id' => 'nullable|uuid',
        ]);

        $appointment = $this->appointmentService->store($data, $p->business_id, $user->id);
        EntityChanged::dispatch($p->business_id, 'appointment', 'created', $appointment->id);
        return response()->json($appointment, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $data = $request->validate([
            'client_id' => 'sometimes|uuid',
            'employee_id' => 'sometimes|uuid',
            'service_id' => 'sometimes|uuid',
            'assistant_employee_id' => 'nullable|uuid',
            'start_time' => 'sometimes|date',
            'end_time' => 'sometimes|date|after:start_time',
            'service_notes' => 'nullable|string',
            'internal_notes' => 'nullable|string',
            'price_override' => 'nullable|numeric|min:0',
            'employee_percentage_override' => 'nullable|numeric|min:0|max:100',
            'assistant_percentage' => 'nullable|numeric|min:0|max:100',
            'duration_override' => 'nullable|integer|min:1',
            'group_id' => 'nullable|uuid',
            'branch_id' => 'nullable|uuid',
        ]);

        $appointment = $this->appointmentService->update($id, $data, $p?->business_id);
        EntityChanged::dispatch($p->business_id, 'appointment', 'updated', $id);
        return response()->json($appointment);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $this->appointmentService->destroy($id, $p?->business_id);
        EntityChanged::dispatch($p->business_id, 'appointment', 'deleted', $id);
        return response()->json(null, 204);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $data = $request->validate([
            'status' => 'required|in:pending,confirmed,in_progress,completed,cancelled,no_show',
        ]);

        $appointment = $this->appointmentService->updateStatus($id, $data['status'], $p?->business_id);
        EntityChanged::dispatch($p->business_id, 'appointment', 'updated', $id);
        return response()->json($appointment);
    }

    public function updateTime(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $data = $request->validate([
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
        ]);

        $appointment = $this->appointmentService->updateTime($id, $data['start_time'], $data['end_time'], $p?->business_id);
        EntityChanged::dispatch($p->business_id, 'appointment', 'updated', $id);
        return response()->json($appointment);
    }
}
