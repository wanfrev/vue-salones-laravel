<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Http\Requests\StoreAppointmentRequest;
use App\Http\Requests\UpdateAppointmentRequest;
use App\Models\Appointment;
use App\Models\Business;
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

    private function shouldHideClientPhoneFromEmployee(Request $request, string $businessId): bool
    {
        $profile = $request->user()?->profile;
        if (!$profile || $profile->role !== 'empleado') return false;
        $business = Business::find($businessId);
        if (!$business) return false;
        $features = is_array($business->features) ? $business->features : json_decode($business->features ?? '[]', true);
        return (bool) ($features['hide_client_phone_from_employees'] ?? false);
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

        $list = $this->appointmentService->list(
            $businessId,
            $startDate,
            $endDate,
            $employeeId,
            $request->get('branch_id'),
            $request->get('status'),
            $request->get('group_id'),
            $request->get('id_not'),
        );

        if ($this->shouldHideClientPhoneFromEmployee($request, $businessId)) {
            $list->transform(function ($appointment) {
                if ($appointment->client) {
                    $appointment->client->phone = '';
                    $appointment->client->email = null;
                    $appointment->client->notes = null;
                }
                return $appointment;
            });
        }

        return response()->json($list);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request) ?? '';
        $appointment = $this->appointmentService->findForBusiness($id, $businessId);
        if (!$appointment) return response()->json(['error' => ['message' => 'No encontrado.']], 404);
        $appointment->load(['client', 'service', 'employeeProfile', 'assistantProfile']);

        if ($this->shouldHideClientPhoneFromEmployee($request, $businessId) && $appointment->client) {
            $appointment->client->phone = '';
            $appointment->client->email = null;
            $appointment->client->notes = null;
        }

        return response()->json($appointment);
    }

    public function store(StoreAppointmentRequest $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $appointment = $this->appointmentService->store($request->validated(), $businessId, $request->user()->id);
        $appointment->load(['client', 'service', 'employeeProfile', 'assistantProfile']);
        EntityChanged::safe($businessId, 'appointment', 'created', $appointment->id);

        $creatorProfileId = $request->user()?->profile?->id;
        $notifiedProfiles = $creatorProfileId ? [$creatorProfileId] : [];
        $notifService = app(NotificationService::class);
        $clientName = $appointment->client?->full_name ?? 'Cliente';
        $serviceName = $appointment->service?->name ?? 'Servicio';
        $employeeName = $appointment->employeeProfile?->full_name ?? '';
        $startTime = $appointment->start_time;

        // Check if notifications already exist for this appointment
        $existingNotifications = \App\Models\Notification::where('business_id', $businessId)
            ->where('appointment_id', $appointment->id)
            ->where('type', 'new_appointment')
            ->pluck('profile_id')
            ->toArray();

        \Illuminate\Support\Facades\Log::info("[AppointmentController] Creating notifications for appointment {$appointment->id}. Existing: " . implode(', ', $existingNotifications ?: ['none']));

        $rows = [];

        $base = [
            'business_id' => $businessId,
            'branch_id' => $appointment->branch_id,
            'appointment_id' => $appointment->id,
            'type' => 'new_appointment',
            'client_name' => $clientName,
            'service_name' => $serviceName,
            'appointment_time' => $startTime,
        ];

        // Notify assigned employee (skip if already notified)
        if ($appointment->employee_id && $appointment->employee_id !== $creatorProfileId && !in_array($appointment->employee_id, $existingNotifications)) {
            $rows[] = $base + [
                'profile_id' => $appointment->employee_id,
                'title' => 'Nueva cita agendada',
                'message' => "{$clientName} — {$serviceName}",
            ];
            $notifiedProfiles[] = $appointment->employee_id;
        } else if ($appointment->employee_id) {
            \Illuminate\Support\Facades\Log::info("[AppointmentController] Skipped notification for employee {$appointment->employee_id} (creator or duplicate)");
            $notifiedProfiles[] = $appointment->employee_id;
        }

        // Notify assistant if assigned (and different from creator)
        if ($appointment->assistant_employee_id && $appointment->assistant_employee_id !== $creatorProfileId && !in_array($appointment->assistant_employee_id, $existingNotifications)) {
            $rows[] = $base + [
                'profile_id' => $appointment->assistant_employee_id,
                'title' => 'Nueva cita como asistente',
                'message' => "{$clientName} — {$serviceName}",
            ];
            $notifiedProfiles[] = $appointment->assistant_employee_id;
        }

        // Notify admins and encargados (avoid duplicates)
        $admins = $this->getAdminsToNotify($businessId, $appointment->branch_id);
        foreach ($admins as $admin) {
            if (in_array($admin->id, $notifiedProfiles) || in_array($admin->id, $existingNotifications)) continue;

            $rows[] = $base + [
                'profile_id' => $admin->id,
                'title' => 'Nueva cita agendada',
                'message' => "{$clientName} — {$serviceName}" . ($employeeName ? " con {$employeeName}" : ''),
            ];
        }

        $created = $notifService->createMany($rows);
        \Illuminate\Support\Facades\Log::info("[AppointmentController] {$created->count()} notifications created for appointment {$appointment->id}");

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

        $base = [
            'business_id' => $businessId,
            'branch_id' => $appointment->branch_id,
            'appointment_id' => $appointment->id,
            'type' => 'status_change',
            'title' => "Cita {$statusLabel}",
            'message' => "{$clientName} — {$serviceName}",
            'client_name' => $clientName,
            'service_name' => $serviceName,
            'appointment_time' => $appointment->start_time,
        ];

        $rows = [];
        $notifiedProfiles = [];

        // Notify assigned employee
        if ($appointment->employee_id) {
            $rows[] = $base + ['profile_id' => $appointment->employee_id];
            $notifiedProfiles[] = $appointment->employee_id;
        }

        // Notify admins and encargados
        $admins = $this->getAdminsToNotify($businessId, $appointment->branch_id);
        foreach ($admins as $admin) {
            if (in_array($admin->id, $notifiedProfiles)) continue;
            $rows[] = $base + ['profile_id' => $admin->id];
        }

        $notifService->createMany($rows);

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
