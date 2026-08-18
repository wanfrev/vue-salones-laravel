<?php

namespace App\Services\Staffing;

use App\Models\Profile;
use App\Models\StaffingCompanyEmployee;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * A staffing worker's company assignments — which client companies they're currently placed at,
 * and what role (and therefore rate) they hold at each. See migration
 * 2026_08_17_000000_create_staffing_company_employees_table for why this replaced a single
 * profiles.staffing_company_id/staffing_role pair: the same person can work two companies at
 * once, at different roles, simultaneously.
 */
class StaffingCompanyEmployeeService
{
    /** @return Collection<int, StaffingCompanyEmployee> */
    public function assignmentsForEmployee(string $employeeId): Collection
    {
        return StaffingCompanyEmployee::with('company:id,name')
            ->where('employee_id', $employeeId)
            ->get();
    }

    /**
     * Replaces the full set of assignments for one employee — same "caller sends the whole set,
     * we diff it" contract as ProfileService::syncSchedules. Wholesale delete+recreate is simpler
     * and safe here: nothing else references a staffing_company_employees row by its own id.
     *
     * @param list<array{company_id: string, role: string, shift?: string|null}> $assignments
     */
    public function syncForEmployee(string $employeeId, string $businessId, array $assignments): void
    {
        DB::transaction(function () use ($employeeId, $businessId, $assignments) {
            StaffingCompanyEmployee::where('employee_id', $employeeId)->delete();

            foreach ($assignments as $assignment) {
                if (empty($assignment['company_id']) || empty($assignment['role'])) {
                    continue;
                }

                StaffingCompanyEmployee::create([
                    'id' => Str::uuid()->toString(),
                    'business_id' => $businessId,
                    'company_id' => $assignment['company_id'],
                    'employee_id' => $employeeId,
                    'role' => $assignment['role'],
                    'shift' => $assignment['shift'] ?? null,
                ]);
            }
        });
    }

    /**
     * The roster for one company's Nómina hours grid — every employee currently assigned there,
     * each carrying `staffing_role` set to their role *at this company* (not a global role), so
     * existing consumers (StaffingHoursPanel's rate lookup, RateCardEditor's headcount) keep
     * working against the same Profile-shaped response they always have.
     */
    public function employeesForCompany(string $businessId, string $companyId): Collection
    {
        $assignments = StaffingCompanyEmployee::where('business_id', $businessId)
            ->where('company_id', $companyId)
            ->get()
            ->keyBy('employee_id');

        if ($assignments->isEmpty()) {
            return collect();
        }

        return Profile::where('business_id', $businessId)
            ->whereIn('id', $assignments->keys())
            ->where('active', true)
            ->orderBy('full_name')
            ->get()
            ->map(function (Profile $employee) use ($assignments) {
                $employee->staffing_role = $assignments[$employee->id]->role;
                $employee->staffing_shift = $assignments[$employee->id]->shift;
                return $employee;
            });
    }

    public function roleForEmployeeAtCompany(string $employeeId, string $companyId): ?string
    {
        return StaffingCompanyEmployee::where('employee_id', $employeeId)
            ->where('company_id', $companyId)
            ->value('role');
    }

    public function shiftForEmployeeAtCompany(string $employeeId, string $companyId): ?string
    {
        return StaffingCompanyEmployee::where('employee_id', $employeeId)
            ->where('company_id', $companyId)
            ->value('shift');
    }

    /** Every company this employee is currently assigned to, with the role held at each. */
    public function companiesForEmployee(string $employeeId): Collection
    {
        return StaffingCompanyEmployee::with('company:id,name')
            ->where('employee_id', $employeeId)
            ->get()
            ->map(fn (StaffingCompanyEmployee $a) => [
                'companyId' => $a->company_id,
                'companyName' => $a->company?->name,
                'role' => $a->role,
                'shift' => $a->shift,
            ]);
    }
}
