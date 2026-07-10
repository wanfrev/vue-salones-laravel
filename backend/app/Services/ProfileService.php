<?php

namespace App\Services;

use App\Models\EmployeeSchedule;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ProfileService
{
    public function find(string $id): Profile
    {
        $profile = Profile::find($id);
        if (! $profile) {
            throw new NotFoundHttpException('Perfil no encontrado.');
        }
        return $profile;
    }

    public function list(string $businessId, ?string $branchId = null): Collection
    {
        $query = Profile::with('schedules')
            ->where('role', 'empleado')
            ->where('active', true)
            ->orderBy('full_name');

        if ($branchId) {
            $query->whereHas('schedules', fn($q) =>
                $q->where('branch_id', $branchId)
            );
        }

        return $query->get()->map(function ($profile) {
            $data = $profile->toArray();
            $data['employee_schedules'] = $profile->schedules?->toArray() ?? [];
            return $data;
        });
    }

    public function store(array $data, string $businessId): Profile
    {
        $email = strtolower($data['email']);

        DB::beginTransaction();
        try {
            $user = User::create([
                'name' => $data['full_name'],
                'email' => $email,
                'password' => $data['password'],
            ]);

            Profile::create([
                'id' => $user->id,
                'business_id' => $businessId,
                'full_name' => $data['full_name'],
                'role' => 'empleado',
                'phone' => $data['phone'] ?? null,
                'email' => $email,
                'job_title' => $data['job_title'] ?? null,
                'pay_type' => $data['pay_type'],
                'pay_percentage' => $data['pay_percentage'] ?? 50,
                'base_salary' => $data['base_salary'] ?? 0,
                'active' => true,
            ]);

            $this->syncSchedules($user->id, $data['schedules'] ?? []);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw new HttpException(500, 'Error al crear empleado: ' . $e->getMessage());
        }

        return Profile::with('schedules')->find($user->id);
    }

    public function update(string $id, array $data, string $businessId): Profile
    {
        $profile = $this->findForBusiness($id, $businessId);

        $userUpdates = array_filter([
            'name' => $data['full_name'] ?? null,
            'email' => isset($data['email']) ? strtolower($data['email']) : null,
        ]);
        if (!empty($userUpdates)) {
            User::where('id', $id)->update($userUpdates);
        }
        if (!empty($data['password'])) {
            User::where('id', $id)->update(['password' => bcrypt($data['password'])]);
        }

        $profileFields = array_filter([
            'full_name' => $data['full_name'] ?? null,
            'phone' => $data['phone'] ?? null,
            'email' => isset($data['email']) ? strtolower($data['email']) : null,
            'job_title' => $data['job_title'] ?? null,
            'pay_type' => $data['pay_type'] ?? null,
            'pay_percentage' => $data['pay_percentage'] ?? null,
            'base_salary' => $data['base_salary'] ?? null,
        ], fn($v) => $v !== null) + ['updated_at' => now()];

        if (array_key_exists('salary_frequency', $data)) {
            $profileFields['salary_frequency'] = $data['salary_frequency'];
        }
        if (array_key_exists('disable_agenda', $data)) {
            $profileFields['disable_agenda'] = $data['disable_agenda'];
        }
        if (array_key_exists('can_create_appointments', $data)) {
            $profileFields['can_create_appointments'] = $data['can_create_appointments'];
        }
        if (array_key_exists('can_create_clients', $data)) {
            $profileFields['can_create_clients'] = $data['can_create_clients'];
        }
        if (array_key_exists('active', $data)) {
            $profileFields['active'] = $data['active'];
        }

        $profile->update($profileFields);

        if (array_key_exists('schedules', $data)) {
            EmployeeSchedule::where('employee_id', $id)->delete();
            $this->syncSchedules($id, $data['schedules'] ?? []);
        }

        return Profile::with('schedules')->find($id);
    }

    public function destroy(string $id, string $businessId): void
    {
        $profile = $this->findForBusiness($id, $businessId);
        $profile->update(['active' => false, 'updated_at' => now()]);
        User::where('id', $id)->update(['updated_at' => now()]);
    }

    public function findForBusiness(string $id, string $businessId): Profile
    {
        $profile = Profile::find($id);
        if (!$profile || $profile->business_id !== $businessId) {
            throw new NotFoundHttpException('Empleado no encontrado.');
        }
        return $profile;
    }

    private function syncSchedules(string $employeeId, array $schedules): void
    {
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
