<?php

namespace App\Services;

use App\Models\Appointment;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class AppointmentService
{
    public function list(
        string $businessId,
        ?string $startDate = null,
        ?string $endDate = null,
        ?string $employeeId = null,
        ?string $branchId = null,
        string|array|null $status = null,
        ?string $groupId = null,
        ?string $idNot = null,
    ): Collection {
        $query = Appointment::with(['client', 'service', 'employeeProfile', 'assistantProfile'])
            ->where('business_id', $businessId)
            ->orderBy('start_time');

        if ($startDate) $query->where('start_time', '>=', $startDate);
        if ($endDate) $query->where('start_time', '<=', $endDate);
        if ($employeeId) {
            $query->where(function ($q) use ($employeeId) {
                $q->where('employee_id', $employeeId)
                  ->orWhere('assistant_employee_id', $employeeId);
            });
        }
        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }
        if ($status) $query->whereIn('status', (array) $status);
        if ($groupId) $query->where('group_id', $groupId);
        if ($idNot) $query->where('id', '!=', $idNot);

        return $query->get();
    }

    public function store(array $data, string $businessId, string $createdBy): Appointment
    {
        return Appointment::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'branch_id' => $data['branch_id'] ?? null,
            'client_id' => $data['client_id'],
            'employee_id' => $data['employee_id'],
            'service_id' => $data['service_id'],
            'assistant_employee_id' => $data['assistant_employee_id'] ?? null,
            'start_time' => $data['start_time'],
            'end_time' => $data['end_time'],
            'status' => $data['status'] ?? 'pending',
            'payment_status' => 'unpaid',
            'service_notes' => $data['service_notes'] ?? null,
            'internal_notes' => $data['internal_notes'] ?? null,
            'source' => $data['source'] ?? 'internal',
            'created_by' => $createdBy,
            'group_id' => $data['group_id'] ?? null,
            'price_override' => $data['price_override'] ?? null,
            'employee_percentage_override' => $data['employee_percentage_override'] ?? null,
            'assistant_percentage' => $data['assistant_percentage'] ?? null,
            'duration_override' => $data['duration_override'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function update(string $id, array $data, string $businessId): Appointment
    {
        $appointment = $this->findForBusiness($id, $businessId);

        $fillable = [
            'client_id', 'employee_id', 'service_id', 'assistant_employee_id',
            'start_time', 'end_time', 'service_notes', 'internal_notes',
            'price_override', 'employee_percentage_override', 'assistant_percentage',
            'duration_override', 'group_id', 'branch_id',
        ];

        $appointment->update(array_filter($data, fn($k) => in_array($k, $fillable), ARRAY_FILTER_USE_KEY) + [
            'updated_at' => now(),
        ]);

        return $appointment->fresh();
    }

    public function updateStatus(string $id, string $status, string $businessId): Appointment
    {
        $appointment = $this->findForBusiness($id, $businessId);
        $appointment->update(['status' => $status, 'updated_at' => now()]);
        return $appointment->fresh();
    }

    public function updateTime(string $id, string $startTime, string $endTime, string $businessId): Appointment
    {
        $appointment = $this->findForBusiness($id, $businessId);
        $appointment->update([
            'start_time' => $startTime,
            'end_time' => $endTime,
            'updated_at' => now(),
        ]);
        return $appointment->fresh();
    }

    public function destroy(string $id, string $businessId): void
    {
        $appointment = $this->findForBusiness($id, $businessId);
        $appointment->delete();
    }

    public function getPendingPayments(string $businessId, ?string $branchId = null): Collection
    {
        $query = Appointment::with(['client', 'service', 'employeeProfile'])
            ->where('business_id', $businessId)
            ->whereIn('status', ['completed', 'confirmed'])
            ->whereIn('payment_status', ['unpaid', 'partial'])
            ->orderBy('start_time');

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        return $query->get()
            ->map(fn($a) => array_merge($a->toArray(), [
                'clients' => $a->client?->toArray(),
                'services' => $a->service?->toArray(),
                'profiles' => $a->employeeProfile?->toArray(),
            ]));
    }

    public function groupMembers(string $groupId, string $businessId): Collection
    {
        return Appointment::with(['client', 'service', 'employeeProfile'])
            ->where('group_id', $groupId)
            ->get();
    }

    public function findForBusiness(string $id, string $businessId): Appointment
    {
        $appointment = Appointment::find($id);
        if (!$appointment || $appointment->business_id !== $businessId) {
            throw new NotFoundHttpException('Cita no encontrada.');
        }
        return $appointment;
    }

    public function find(string $id): ?Appointment
    {
        return Appointment::find($id);
    }
}
