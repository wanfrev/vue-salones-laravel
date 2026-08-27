<?php

namespace App\Services;

use App\Models\EmployeeSchedule;
use App\Models\Profile;
use App\Models\StaffingCompanyEmployee;
use App\Models\User;
use App\Services\Staffing\StaffingCompanyEmployeeService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ProfileService
{
    public function __construct(
        private StaffingCompanyEmployeeService $companyEmployees,
    ) {}

    /**
     * Gates every staffing_company_employees touch below — outside the staffing niche this table
     * is always empty, so skipping it isn't just an optimization, it keeps every other niche's
     * employee list/save from ever running a query against a table that has nothing to do with them.
     */
    private function isStaffingBusiness(): bool
    {
        if (!app()->bound(BusinessContext::class)) {
            return false;
        }

        return app(BusinessContext::class)->hasCapability('staffing.timesheets');
    }

    public function find(string $id): Profile
    {
        $profile = Profile::find($id);
        if (! $profile) {
            throw new NotFoundHttpException('Perfil no encontrado.');
        }
        return $profile;
    }

    public function list(string $businessId, ?string $branchId = null, $disableAgenda = null, ?string $activeFilter = null): Collection
    {
        $query = Profile::with('schedules')
            ->where('business_id', $businessId)
            ->whereIn('role', ['empleado', 'encargado'])
            ->orderBy('full_name');

        if ($activeFilter === 'inactive') {
            $query->where('active', false);
        } elseif ($activeFilter !== 'all') {
            $query->where('active', true);
        }

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->where('branch_id', $branchId)
                  ->orWhereHas('schedules', fn($sq) =>
                      $sq->where('branch_id', $branchId)
                  );
            });
        }

        if ($disableAgenda !== null) {
            $query->where('disable_agenda', filter_var($disableAgenda, FILTER_VALIDATE_BOOL));
        }

        $profiles = $query->get();

        // One query for every assignment in the business rather than N+1 per profile — skipped
        // entirely outside staffing, where this table is always empty for this business anyway.
        $assignmentsByEmployee = $this->isStaffingBusiness()
            ? StaffingCompanyEmployee::with(['company:id,name', 'project:id,name'])
                ->where('business_id', $businessId)
                ->get()
                ->groupBy('employee_id')
            : collect();

        return $profiles->map(function ($profile) use ($assignmentsByEmployee) {
            $data = $profile->toArray();
            $data['employee_schedules'] = $profile->schedules?->toArray() ?? [];
            $data['staffing_assignments'] = ($assignmentsByEmployee->get($profile->id) ?? collect())
                ->map(fn (StaffingCompanyEmployee $a) => [
                    'company_id' => $a->company_id,
                    'company_name' => $a->company?->name,
                    'project_id' => $a->project_id,
                    'project_name' => $a->project?->name,
                    'role' => $a->role,
                    'shift' => $a->shift,
                ])->values();
            return $data;
        });
    }

    public function store(array $data, string $businessId): Profile
    {
        // Staffing workers get no login at all: the controller makes email/password optional
        // for that niche, and a real users row still has to exist (profiles.id = users.id,
        // and users.email/password are NOT NULL) so this fills in credentials nobody is ever
        // given — a random password and an email address that resolves nowhere.
        $email = !empty($data['email']) ? strtolower($data['email']) : $this->generateNoLoginEmail();
        $password = !empty($data['password']) ? $data['password'] : Str::random(40);

        DB::beginTransaction();
        try {
            $user = User::create([
                'name' => $data['full_name'],
                'email' => $email,
                'password' => $password,
            ]);

            Profile::create([
                'id' => $user->id,
                'business_id' => $businessId,
                'branch_id' => $data['branch_id'] ?? null,
                'full_name' => $data['full_name'],
                'role' => $data['role'] ?? 'empleado',
                'phone' => $data['phone'] ?? null,
                'email' => $email,
                'job_title' => $data['job_title'] ?? null,
                'pay_type' => $data['pay_type'] ?? 'percentage',
                'pay_percentage' => $data['pay_percentage'] ?? 50,
                'base_salary' => $data['base_salary'] ?? 0,
                // profiles.salary_frequency is NOT NULL — callers that skip the salary UI
                // entirely (e.g. NuevaVendedoraModal, which only sets pay_type/pay_percentage's
                // implicit percentage default) never send this, so it needs a real fallback here
                // rather than null, same as pay_type/pay_percentage/base_salary above.
                'salary_frequency' => $data['salary_frequency'] ?? 'monthly',
                'product_commission_percentage' => $data['product_commission_percentage'] ?? null,
                'disable_agenda' => $data['disable_agenda'] ?? false,
                'disable_inventory_edit' => $data['disable_inventory_edit'] ?? false,
                'show_in_public_booking' => $data['show_in_public_booking'] ?? true,
                'can_create_appointments' => $data['can_create_appointments'] ?? true,
                'can_create_clients' => $data['can_create_clients'] ?? true,
                'can_access_consultorio' => $data['can_access_consultorio'] ?? true,
                'can_access_inventory' => $data['can_access_inventory'] ?? false,
                'can_access_pos' => $data['can_access_pos'] ?? false,
                'can_access_suppliers' => $data['can_access_suppliers'] ?? false,
                'can_access_finanzas' => $data['can_access_finanzas'] ?? false,
                'can_access_requirements' => $data['can_access_requirements'] ?? false,
                'staffing_tax_rate' => $data['staffing_tax_rate'] ?? null,
                'ssn' => $data['ssn'] ?? null,
                'address' => $data['address'] ?? null,
                'bank_name' => $data['bank_name'] ?? null,
                'bank_account_holder' => $data['bank_account_holder'] ?? null,
                'bank_account_type' => $data['bank_account_type'] ?? null,
                'payment_method' => $data['payment_method'] ?? null,
                'bank_routing_number' => $data['bank_routing_number'] ?? null,
                'bank_account_number' => $data['bank_account_number'] ?? null,
                'payroll_card_number' => $data['payroll_card_number'] ?? null,
                'active' => true,
            ]);

            $this->syncSchedules($user->id, $data['schedules'] ?? []);

            // The generic (non-staffing) employee form always sends this key too, as an empty
            // array — the niche check is what keeps a salon/spa/tienda save from ever writing to
            // a table that has nothing to do with them.
            if ($this->isStaffingBusiness() && array_key_exists('staffing_assignments', $data)) {
                $this->companyEmployees->syncForEmployee($user->id, $businessId, $data['staffing_assignments'] ?? []);
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw new HttpException(500, 'Error al crear empleado: ' . $e->getMessage());
        }

        return Profile::with('schedules')->find($user->id);
    }

    private function generateNoLoginEmail(): string
    {
        return 'staffing-' . Str::uuid()->toString() . '@no-login.internal';
    }

    public function update(string $id, array $data, string $businessId): Profile
    {
        return DB::transaction(function () use ($id, $data, $businessId) {
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
                'role' => $data['role'] ?? null,
                'pay_type' => $data['pay_type'] ?? null,
                'pay_percentage' => $data['pay_percentage'] ?? null,
                'base_salary' => $data['base_salary'] ?? null,
                'branch_id' => $data['branch_id'] ?? null,
            ], fn($v) => $v !== null) + ['updated_at' => now()];

            if (array_key_exists('salary_frequency', $data)) {
                $profileFields['salary_frequency'] = $data['salary_frequency'];
            }
            if (array_key_exists('product_commission_percentage', $data)) {
                $profileFields['product_commission_percentage'] = $data['product_commission_percentage'];
            }
            if (array_key_exists('disable_agenda', $data)) {
                $profileFields['disable_agenda'] = $data['disable_agenda'];
            }
            if (array_key_exists('show_in_public_booking', $data)) {
                $profileFields['show_in_public_booking'] = $data['show_in_public_booking'];
            }
            if (array_key_exists('disable_inventory_edit', $data)) {
                $profileFields['disable_inventory_edit'] = $data['disable_inventory_edit'];
            }
            if (array_key_exists('can_create_appointments', $data)) {
                $profileFields['can_create_appointments'] = $data['can_create_appointments'];
            }
            if (array_key_exists('can_create_clients', $data)) {
                $profileFields['can_create_clients'] = $data['can_create_clients'];
            }
            if (array_key_exists('can_access_consultorio', $data)) {
                $profileFields['can_access_consultorio'] = $data['can_access_consultorio'];
            }
            if (array_key_exists('can_access_inventory', $data)) {
                $profileFields['can_access_inventory'] = $data['can_access_inventory'];
            }
            if (array_key_exists('can_access_pos', $data)) {
                $profileFields['can_access_pos'] = $data['can_access_pos'];
            }
            if (array_key_exists('can_access_finanzas', $data)) {
                $profileFields['can_access_finanzas'] = $data['can_access_finanzas'];
            }
            if (array_key_exists('can_access_suppliers', $data)) {
                $profileFields['can_access_suppliers'] = $data['can_access_suppliers'];
            }
            if (array_key_exists('can_access_requirements', $data)) {
                $profileFields['can_access_requirements'] = $data['can_access_requirements'];
            }
            foreach ([
                'staffing_tax_rate', 'ssn', 'address',
                'bank_name', 'bank_account_holder', 'bank_account_type', 'payment_method',
                'bank_routing_number', 'bank_account_number', 'payroll_card_number',
            ] as $staffingField) {
                if (array_key_exists($staffingField, $data)) {
                    $profileFields[$staffingField] = $data[$staffingField];
                }
            }
            if (array_key_exists('active', $data)) {
                $profileFields['active'] = $data['active'];
            }

            $profile->update($profileFields);

            if (array_key_exists('schedules', $data)) {
                EmployeeSchedule::where('employee_id', $id)->delete();
                $this->syncSchedules($id, $data['schedules'] ?? []);
            }

            if ($this->isStaffingBusiness() && array_key_exists('staffing_assignments', $data)) {
                $this->companyEmployees->syncForEmployee($id, $businessId, $data['staffing_assignments'] ?? []);
            }

            return Profile::with('schedules')->find($id);
        });
    }

    /**
     * "Eliminar" means gone — everything about this employee, permanently — but a worker with
     * real history (an appointment, a staffing hour, a tax entry) must never lose it, so those
     * tables were built with `RESTRICT`/`NO ACTION` on `employee_id` (see the FK audit that
     * motivated this — `information_schema` on `profiles`, not just the migrations, since this
     * schema predates several of them). Deleting `users` cascades through `profiles` and every
     * FK that's safe to lose with the employee (schedules, staffing assignments, documents,
     * payments); the database itself rejects it — atomically, nothing partially deleted — the
     * moment any RESTRICTed table still references them. That rejection is the signal to fall
     * back to the old behavior: mark inactive instead, so the employee simply moves to the
     * "Inactivos" list rather than vanishing without their history.
     *
     * @return bool true if the employee was actually deleted, false if it fell back to inactive.
     */
    public function destroy(string $id, string $businessId): bool
    {
        $profile = $this->findForBusiness($id, $businessId);

        try {
            DB::transaction(function () use ($id) {
                User::where('id', $id)->delete();
            });
            return true;
        } catch (QueryException $e) {
            if ($e->getCode() !== '23503') {
                throw $e;
            }
            $profile->update(['active' => false, 'updated_at' => now()]);
            User::where('id', $id)->update(['updated_at' => now()]);
            return false;
        }
    }

    public function findForBusiness(string $id, string $businessId): Profile
    {
        $profile = Profile::find($id);
        if (!$profile) {
            throw new NotFoundHttpException('Empleado no encontrado.');
        }
        if ($businessId !== '' && $profile->business_id !== $businessId) {
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
