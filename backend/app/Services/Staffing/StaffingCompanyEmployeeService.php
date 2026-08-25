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
        return StaffingCompanyEmployee::with(['company:id,name', 'project:id,name'])
            ->where('employee_id', $employeeId)
            ->get();
    }

    /**
     * Replaces the full set of assignments for one employee — same "caller sends the whole set,
     * we diff it" contract as ProfileService::syncSchedules. Wholesale delete+recreate is simpler
     * and safe here: nothing else references a staffing_company_employees row by its own id.
     *
     * @param list<array{company_id: string, project_id?: string|null, role: string, shift?: string|null}> $assignments
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
                    'project_id' => $assignment['project_id'] ?? null,
                    'employee_id' => $employeeId,
                    'role' => $assignment['role'],
                    'shift' => $assignment['shift'] ?? null,
                ]);
            }
        });
    }

    /**
     * The roster for one company's Nómina hours grid — one row per (employee, role) ASSIGNMENT,
     * not one per employee: a worker holding two roles at the same company must appear twice,
     * each carrying its own `staffing_role`, so each role's hours/rate are entered and shown
     * separately. Cloning the Profile per assignment matters — without it, an employee with two
     * assignments would share one Profile instance and the second `staffing_role` write would
     * silently overwrite the first row's.
     */
    public function employeesForCompany(string $businessId, string $companyId, ?string $projectId = null): Collection
    {
        $query = StaffingCompanyEmployee::where('business_id', $businessId)
            ->where('company_id', $companyId);

        // Only narrow by project when the caller actually asked for one (e.g. entering hours for
        // a specific project) — unscoped callers like RateCardEditor's headcount still expect
        // every employee assigned to the company, project or not.
        if ($projectId) {
            $query->where('project_id', $projectId);
        }

        $assignments = $query->get();

        if ($assignments->isEmpty()) {
            return collect();
        }

        $profiles = Profile::where('business_id', $businessId)
            ->whereIn('id', $assignments->pluck('employee_id')->unique())
            ->where('active', true)
            ->get()
            ->keyBy('id');

        return $assignments
            ->map(function (StaffingCompanyEmployee $assignment) use ($profiles) {
                $profile = $profiles->get($assignment->employee_id);
                if (!$profile) {
                    return null;
                }
                $row = clone $profile;
                $row->staffing_role = $assignment->role;
                $row->staffing_shift = $assignment->shift;
                $row->staffing_assignment_id = $assignment->id;
                return $row;
            })
            ->filter()
            ->sortBy('full_name')
            ->values();
    }

    /**
     * The exact assignment an hours entry belongs to. `$role` disambiguates when the employee
     * holds more than one role at this company/project — pass it whenever the caller already
     * knows which one (e.g. a timesheet entry that recorded its role at save time). Without it,
     * this returns the first matching row, same fallback `roleForEmployeeAtCompany` used before
     * multi-role-per-company existed.
     */
    public function assignmentFor(string $employeeId, string $companyId, ?string $projectId, ?string $role): ?StaffingCompanyEmployee
    {
        return StaffingCompanyEmployee::where('employee_id', $employeeId)
            ->where('company_id', $companyId)
            ->when($projectId, fn ($q) => $q->where('project_id', $projectId))
            ->when($role !== null, fn ($q) => $q->where('role', $role))
            ->first();
    }

    /**
     * A worker can now hold more than one role at the same company (one per project/shift), so
     * `$projectId` — when the caller has one, e.g. a project-scoped timesheet — disambiguates
     * which assignment's role applies. Without it, this falls back to the first matching row,
     * same as before multi-role-per-company was allowed.
     */
    public function roleForEmployeeAtCompany(string $employeeId, string $companyId, ?string $projectId = null): ?string
    {
        return StaffingCompanyEmployee::where('employee_id', $employeeId)
            ->where('company_id', $companyId)
            ->when($projectId, fn ($q) => $q->where('project_id', $projectId))
            ->value('role');
    }

    public function shiftForEmployeeAtCompany(string $employeeId, string $companyId, ?string $projectId = null): ?string
    {
        return StaffingCompanyEmployee::where('employee_id', $employeeId)
            ->where('company_id', $companyId)
            ->when($projectId, fn ($q) => $q->where('project_id', $projectId))
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
