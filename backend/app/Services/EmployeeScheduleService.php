<?php

namespace App\Services;

use App\Models\EmployeeSchedule;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class EmployeeScheduleService
{
    public function list(string $businessId): Collection
    {
        return EmployeeSchedule::with('employee')
            ->whereHas('employee', fn($q) => $q->where('business_id', $businessId))
            ->orderBy('employee_id')
            ->orderBy('weekday')
            ->get();
    }

    public function store(array $data): EmployeeSchedule
    {
        return EmployeeSchedule::create([
            'id' => Str::uuid()->toString(),
            'employee_id' => $data['employee_id'],
            'branch_id' => $data['branch_id'] ?? null,
            'weekday' => $data['weekday'],
            'start_time' => $data['start_time'],
            'end_time' => $data['end_time'],
        ]);
    }

    public function update(string $id, array $data): EmployeeSchedule
    {
        $schedule = EmployeeSchedule::find($id);
        if (!$schedule) throw new NotFoundHttpException('Horario no encontrado.');
        $schedule->update($data);
        return $schedule->fresh();
    }

    public function destroy(string $id): void
    {
        EmployeeSchedule::destroy($id);
    }
}
