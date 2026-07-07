<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Http\Requests\StoreAppointmentRequest;
use App\Http\Requests\UpdateAppointmentRequest;
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

    public function store(StoreAppointmentRequest $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $appointment = $this->appointmentService->store($request->validated(), $p->business_id, $user->id);
        EntityChanged::dispatch($p->business_id, 'appointment', 'created', $appointment->id);
        return response()->json($appointment, 201);
    }

    public function update(UpdateAppointmentRequest $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $appointment = $this->appointmentService->update($id, $request->validated(), $p?->business_id);
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
