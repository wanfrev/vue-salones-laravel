<?php

namespace App\Services;

use App\Models\Appointment;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
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
        $query = Appointment::with($this->getWithRelations())
            ->where('business_id', $businessId)
            ->whereNull('clinical_history')
            ->orderBy('start_time');

        if ($startDate) {
            $cleanStart = preg_replace('/^(gte|lte|gt|lt|eq)\./i', '', $startDate);
            $query->where('start_time', '>=', $cleanStart);
        }
        if ($endDate) {
            $cleanEnd = preg_replace('/^(gte|lte|gt|lt|eq)\./i', '', $endDate);
            $query->where('start_time', '<=', $cleanEnd);
        }
        if ($employeeId && $employeeId !== 'all') {
            $cleanEmp = preg_replace('/^(gte|lte|gt|lt|eq|in)\./i', '', $employeeId);
            $query->where(function ($q) use ($cleanEmp) {
                $q->where('employee_id', $cleanEmp)
                  ->orWhere('assistant_employee_id', $cleanEmp);
            });
        }
        if ($branchId) {
            $cleanBranch = preg_replace('/^(gte|lte|gt|lt|eq|in)\./i', '', $branchId);
            $query->where(function ($q) use ($cleanBranch) {
                $q->whereNull('branch_id')->orWhere('branch_id', $cleanBranch);
            });
        }
        if ($status) {
            $cleanStatus = is_array($status)
                ? array_map(fn($s) => preg_replace('/^(gte|lte|gt|lt|eq|in|neq)\./i', '', $s), (array) $status)
                : preg_replace('/^(gte|lte|gt|lt|eq|in|neq)\./i', '', $status);
            $query->whereIn('status', (array) $cleanStatus);
        }
        if ($groupId) {
            $cleanGroup = preg_replace('/^(gte|lte|gt|lt|eq|in|neq)\./i', '', $groupId);
            $query->where('group_id', $cleanGroup);
        }
        if ($idNot) {
            $cleanIdNot = preg_replace('/^(gte|lte|gt|lt|eq|in|neq)\./i', '', $idNot);
            $query->where('id', '!=', $cleanIdNot);
        }

        return $query->get();
    }

    public function store(array $data, string $businessId, string $createdBy): Appointment
    {
        $fillable = [
            'client_id', 'pet_id', 'employee_id', 'service_id', 'assistant_employee_id',
            'start_time', 'end_time', 'status', 'service_notes', 'internal_notes',
            'source', 'group_id', 'price_override', 'employee_percentage_override',
            'assistant_percentage', 'is_fixed_commission_override', 'employee_amount_override',
            'assistant_amount_override', 'duration_override', 'diagnosis', 'treatment',
            'associated_products', 'clinical_history', 'branch_id',
        ];

        $filtered = array_filter($data, fn($k) => in_array($k, $fillable), ARRAY_FILTER_USE_KEY);

        $isConsultorio = !empty($filtered['clinical_history']);

        if (!$isConsultorio) {
            $this->checkOverlap(
                $businessId,
                $filtered['employee_id'],
                $filtered['start_time'],
                $filtered['end_time'],
                $filtered['assistant_employee_id'] ?? null,
                null,
                $filtered['group_id'] ?? null,
            );
        }

        return Appointment::create($filtered + [
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'service_notes' => $data['service_notes'] ?? null,
            'internal_notes' => $data['internal_notes'] ?? null,
            'source' => $data['source'] ?? 'internal',
            'created_by' => $createdBy,
            'group_id' => $data['group_id'] ?? null,
            'price_override' => $data['price_override'] ?? null,
            'employee_percentage_override' => $data['employee_percentage_override'] ?? null,
            'assistant_percentage' => $data['assistant_percentage'] ?? null,
            'is_fixed_commission_override' => $data['is_fixed_commission_override'] ?? null,
            'employee_amount_override' => $data['employee_amount_override'] ?? null,
            'assistant_amount_override' => $data['assistant_amount_override'] ?? null,
            'duration_override' => $data['duration_override'] ?? null,
            'diagnosis' => $data['diagnosis'] ?? null,
            'treatment' => $data['treatment'] ?? null,
            'associated_products' => $data['associated_products'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function update(string $id, array $data, string $businessId): Appointment
    {
        $appointment = $this->findForBusiness($id, $businessId);

        $fillable = [
            'client_id', 'pet_id', 'employee_id', 'service_id', 'assistant_employee_id',
            'start_time', 'end_time', 'status', 'service_notes', 'internal_notes',
            'price_override', 'employee_percentage_override', 'assistant_percentage',
            'is_fixed_commission_override', 'employee_amount_override', 'assistant_amount_override',
            'duration_override', 'diagnosis', 'treatment', 'associated_products', 'clinical_history',
            'group_id', 'branch_id'
        ];

        $filtered = array_filter($data, fn($k) => in_array($k, $fillable), ARRAY_FILTER_USE_KEY);

        $employeeId = $filtered['employee_id'] ?? $appointment->employee_id;
        $startTime = $filtered['start_time'] ?? $appointment->start_time;
        $endTime = $filtered['end_time'] ?? $appointment->end_time;
        $assistantId = array_key_exists('assistant_employee_id', $filtered)
            ? $filtered['assistant_employee_id']
            : $appointment->assistant_employee_id;

        $isConsultorio = !empty($filtered['clinical_history']) || !empty($appointment->clinical_history);

        if (!$isConsultorio) {
            $this->checkOverlap($businessId, $employeeId, $startTime, $endTime, $assistantId, $id, $appointment->group_id);
        }

        $appointment->update($filtered + [
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
        $this->checkOverlap($businessId, $appointment->employee_id, $startTime, $endTime, $appointment->assistant_employee_id, $id, $appointment->group_id);
        $appointment->update([
            'start_time' => $startTime,
            'end_time' => $endTime,
            'updated_at' => now(),
        ]);
        return $appointment->fresh();
    }

    public function destroy(string $id, string $businessId): void
    {
        DB::transaction(function () use ($id, $businessId) {
            $appointment = $this->findForBusiness($id, $businessId);
            \App\Models\Transaction::where('appointment_id', $id)->delete();
            $appointment->delete();
        });
    }

    public function getPendingPayments(string $businessId, ?string $branchId = null): Collection
    {
        $query = Appointment::with(['client', 'service', 'employeeProfile'])
            ->where('business_id', $businessId)
            ->whereNull('clinical_history')
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
        $cleanGroup = preg_replace('/^(gte|lte|gt|lt|eq|in|neq)\./i', '', $groupId);
        return Appointment::with(['client', 'service', 'employeeProfile'])
            ->where('business_id', $businessId)
            ->where('group_id', $cleanGroup)
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

    private function checkOverlap(
        string $businessId,
        string $employeeId,
        string $startTime,
        string $endTime,
        ?string $assistantId = null,
        ?string $excludeId = null,
        ?string $groupId = null,
    ): void {
        $query = Appointment::where('business_id', $businessId)
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->whereNull('clinical_history')
            ->where('start_time', '<', $endTime)
            ->where('end_time', '>', $startTime)
            ->where(function ($q) use ($employeeId, $assistantId) {
                $q->where(function ($sub) use ($employeeId) {
                    $sub->where('employee_id', $employeeId)
                        ->orWhere('assistant_employee_id', $employeeId);
                });
                if ($assistantId) {
                    $q->orWhere(function ($sub) use ($assistantId) {
                        $sub->where('employee_id', $assistantId)
                            ->orWhere('assistant_employee_id', $assistantId);
                    });
                }
            });

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        if ($groupId) {
            $query->where(function ($q) use ($groupId) {
                $q->whereNull('group_id')->orWhere('group_id', '!=', $groupId);
            });
        }

        $conflict = $query->first();

        if ($conflict) {
            $conflictEmployee = $conflict->employee_id === $employeeId ? 'empleado' : 'asistente';
            throw ValidationException::withMessages([
                'start_time' => "El {$conflictEmployee} ya tiene una cita en ese horario.",
            ]);
        }
    }

    private function getWithRelations(): array
    {
        $relations = ['client', 'service', 'employeeProfile', 'assistantProfile'];
        if (\Illuminate\Support\Facades\Schema::hasTable('service_products')) {
            $relations[] = 'service.linkedProducts.product';
        }
        return $relations;
    }
}
