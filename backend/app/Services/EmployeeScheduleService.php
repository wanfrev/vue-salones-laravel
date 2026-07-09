<?php

namespace App\Services;

use App\Models\EmployeeSchedule;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class EmployeeScheduleService
{
    public function list(string $employeeId): Collection
    {
        return EmployeeSchedule::where('employee_id', $employeeId)
            ->orderBy('weekday')
            ->orderBy('start_time')
            ->get();
    }

    public function listByBusiness(string $businessId): Collection
    {
        return EmployeeSchedule::whereHas('employee', fn($q) => $q->where('business_id', $businessId))
            ->with('employee')
            ->orderBy('weekday')
            ->orderBy('start_time')
            ->get();
    }

    public function getByEmployee(string $employeeId): Collection
    {
        return $this->list($employeeId);
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
            'created_at' => now(),
        ]);
    }

    public function update(string $id, array $data): EmployeeSchedule
    {
        $schedule = EmployeeSchedule::find($id);
        if (!$schedule) {
            throw new NotFoundHttpException('Horario no encontrado.');
        }

        $schedule->update(array_filter($data, fn($k) => in_array($k, [
            'branch_id', 'weekday', 'start_time', 'end_time',
        ]), ARRAY_FILTER_USE_KEY));

        return $schedule;
    }

    public function destroy(string $id): void
    {
        $schedule = EmployeeSchedule::find($id);
        if ($schedule) {
            $schedule->delete();
        }
    }

    public function replaceForEmployee(string $employeeId, array $schedules): void
    {
        EmployeeSchedule::where('employee_id', $employeeId)->delete();

        foreach ($schedules as $s) {
            EmployeeSchedule::create([
                'id' => Str::uuid()->toString(),
                'employee_id' => $employeeId,
                'branch_id' => $s['branch_id'] ?? null,
                'weekday' => $s['weekday'],
                'start_time' => $s['start_time'],
                'end_time' => $s['end_time'],
                'created_at' => now(),
            ]);
        }
    }
}
