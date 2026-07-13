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

    private function resolveBusinessId(Request $request): ?string
    {
        return $request->user()?->profile?->business_id;
    }

    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json([]);

        return response()->json(
            $this->appointmentService->list(
                $businessId,
                $request->start_date,
                $request->end_date,
                $request->employee_id,
                $request->branch_id,
                $request->status,
                $request->group_id,
                $request->id_not,
            )
        );
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $appointment = $this->appointmentService->findForBusiness($id, $this->resolveBusinessId($request) ?? '');
        if (!$appointment) return response()->json(['error' => ['message' => 'No encontrado.']], 404);
        $appointment->load(['client', 'service', 'employeeProfile', 'assistantProfile']);
        return response()->json($appointment);
    }

    public function store(StoreAppointmentRequest $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $appointment = $this->appointmentService->store($request->validated(), $businessId, $request->user()->id);
        $appointment->load(['client', 'service', 'employeeProfile', 'assistantProfile']);
        EntityChanged::safe($businessId, 'appointment', 'created', $appointment->id);

        // Notify assigned employee
        $notifService = app(\App\Services\NotificationService::class);
        $clientName = $appointment->client?->full_name ?? 'Cliente';
        $serviceName = $appointment->service?->name ?? 'Servicio';

        $notifService->create([
            'business_id' => $businessId,
            'profile_id' => $appointment->employee_id,
            'appointment_id' => $appointment->id,
            'type' => 'new_appointment',
            'title' => 'Nueva cita agendada',
            'message' => "{$clientName} — {$serviceName}",
            'client_name' => $clientName,
            'service_name' => $serviceName,
            'appointment_time' => $appointment->start_time,
        ]);

        // Notify assistant if assigned
        if ($appointment->assistant_employee_id) {
            $notifService->create([
                'business_id' => $businessId,
                'profile_id' => $appointment->assistant_employee_id,
                'appointment_id' => $appointment->id,
                'type' => 'new_appointment',
                'title' => 'Nueva cita como asistente',
                'message' => "{$clientName} — {$serviceName}",
                'client_name' => $clientName,
                'service_name' => $serviceName,
                'appointment_time' => $appointment->start_time,
            ]);
        }

        EntityChanged::safe($businessId, 'notification', 'created', $appointment->id);

        return response()->json($appointment, 201);
    }

    public function update(UpdateAppointmentRequest $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $appointment = $this->appointmentService->update($id, $request->validated(), $businessId);
        $appointment->load(['client', 'service', 'employeeProfile', 'assistantProfile']);
        EntityChanged::safe($businessId, 'appointment', 'updated', $id);
        return response()->json($appointment);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $this->appointmentService->destroy($id, $businessId);
        EntityChanged::safe($businessId, 'appointment', 'deleted', $id);
        return response()->json(null, 204);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'status' => 'required|in:pending,confirmed,in_progress,completed,cancelled,no_show',
        ]);

        $appointment = $this->appointmentService->updateStatus($id, $data['status'], $businessId);
        $appointment->load(['client', 'service', 'employeeProfile', 'assistantProfile']);
        EntityChanged::safe($businessId, 'appointment', 'updated', $id);
        return response()->json($appointment);
    }

    public function updateTime(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
        ]);

        $appointment = $this->appointmentService->updateTime($id, $data['start_time'], $data['end_time'], $businessId);
        $appointment->load(['client', 'service', 'employeeProfile', 'assistantProfile']);
        EntityChanged::safe($businessId, 'appointment', 'updated', $id);
        return response()->json($appointment);
    }
}
