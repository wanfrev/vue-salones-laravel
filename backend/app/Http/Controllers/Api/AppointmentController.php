<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Http\Requests\StoreAppointmentRequest;
use App\Http\Requests\UpdateAppointmentRequest;
use App\Models\Appointment;
use App\Models\Profile;
use App\Services\AppointmentService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class AppointmentController
{
    public function __construct(
        private AppointmentService $appointmentService,
    ) {}

    private function resolveBusinessId(Request $request): ?string
    {
        return $request->user()?->profile?->business_id;
    }

    private function getAdminsToNotify(string $businessId, ?string $branchId): Collection
    {
        return Profile::where('business_id', $businessId)
            ->where('active', true)
            ->where(function ($query) use ($branchId) {
                $query->whereIn('role', ['admin', 'superadmin']);
                if ($branchId) {
                    $query->orWhere(function ($q) use ($branchId) {
                        $q->where('role', 'encargado')
                          ->where('branch_id', $branchId);
                    });
                }
            })
            ->get();
    }

    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json([]);

        $startDate = $request->get('start_date') ?? $request->get('start_time');
        $endDate = $request->get('end_date') ?? $request->get('end_time');
        $employeeId = $request->get('employee_id');

        if (!$employeeId && $request->has('or')) {
            $orParam = (string) $request->get('or');
            if (preg_match('/employee_id\.eq\.([a-f0-9\-]+)/i', $orParam, $m)) {
                $employeeId = $m[1];
            }
        }

        return response()->json(
            $this->appointmentService->list(
                $businessId,
                $startDate,
                $endDate,
                $employeeId,
                $request->get('branch_id'),
                $request->get('status'),
                $request->get('group_id'),
                $request->get('id_not'),
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
        $notifService = app(NotificationService::class);
        $clientName = $appointment->client?->full_name ?? 'Cliente';
        $serviceName = $appointment->service?->name ?? 'Servicio';
        $employeeName = $appointment->employeeProfile?->full_name ?? '';
        $startTime = $appointment->start_time;

        $notifService->create([
            'business_id' => $businessId,
            'profile_id' => $appointment->employee_id,
            'appointment_id' => $appointment->id,
            'type' => 'new_appointment',
            'title' => 'Nueva cita agendada',
            'message' => "{$clientName} — {$serviceName}",
            'client_name' => $clientName,
            'service_name' => $serviceName,
            'appointment_time' => $startTime,
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
                'appointment_time' => $startTime,
            ]);
        }

        // Notify admins and encargados
        $admins = $this->getAdminsToNotify($businessId, $appointment->branch_id);
        foreach ($admins as $admin) {
            $notifService->create([
                'business_id' => $businessId,
                'profile_id' => $admin->id,
                'appointment_id' => $appointment->id,
                'type' => 'new_appointment',
                'title' => 'Nueva cita agendada',
                'message' => "{$clientName} — {$serviceName}" . ($employeeName ? " con {$employeeName}" : ''),
                'client_name' => $clientName,
                'service_name' => $serviceName,
                'appointment_time' => $startTime,
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

        // Notification: status change
        $clientName = $appointment->client?->full_name ?? 'Cliente';
        $serviceName = $appointment->service?->name ?? 'Servicio';
        $statusLabel = match ($data['status']) {
            'confirmed' => 'Confirmada',
            'pending' => 'Pendiente',
            'completed' => 'Completada',
            'cancelled' => 'Cancelada',
            'no_show' => 'No asistió',
            'in_progress' => 'En progreso',
            default => $data['status'],
        };

        $notifService = app(NotificationService::class);

        // Notify assigned employee
        $notifService->create([
            'business_id' => $businessId,
            'profile_id' => $appointment->employee_id,
            'appointment_id' => $appointment->id,
            'type' => 'status_change',
            'title' => "Cita {$statusLabel}",
            'message' => "{$clientName} — {$serviceName}",
            'client_name' => $clientName,
            'service_name' => $serviceName,
            'appointment_time' => $appointment->start_time,
        ]);

        // Notify admins and encargados
        $admins = $this->getAdminsToNotify($businessId, $appointment->branch_id);
        foreach ($admins as $admin) {
            $notifService->create([
                'business_id' => $businessId,
                'profile_id' => $admin->id,
                'appointment_id' => $appointment->id,
                'type' => 'status_change',
                'title' => "Cita {$statusLabel}",
                'message' => "{$clientName} — {$serviceName}",
                'client_name' => $clientName,
                'service_name' => $serviceName,
                'appointment_time' => $appointment->start_time,
            ]);
        }

        EntityChanged::safe($businessId, 'notification', 'updated', $id);

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

    public function petHistory(Request $request, string $clientId, string $petId): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json([]);

        $appointments = \App\Models\Appointment::with(['service', 'employeeProfile', 'assistantProfile', 'pet'])
            ->where('business_id', $businessId)
            ->where('client_id', $clientId)
            ->where('pet_id', $petId)
            ->whereNotNull('clinical_history')
            ->orderByDesc('start_time')
            ->get();

        return response()->json($appointments);
    }
}
