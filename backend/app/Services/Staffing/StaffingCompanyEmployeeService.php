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

        // Three distinct states, not two — `$projectId` can't just be "truthy or not":
        //  - a real id: scope to that project's assignments only.
        //  - '' (StaffingHoursPanel's General tab, project dropdown unselected or explicitly set
        //    to "General (Sin proyecto)"): scope to `project_id IS NULL` — Eloquent's where()
        //    turns a null value into whereNull() automatically. Without this, an employee placed
        //    on three of the company's projects showed up three times on the General tab, which
        //    is supposed to hold only the project-less assignment.
        //  - null, meaning the caller never sent the param at all (RateCardEditor's headcount):
        //    stays unscoped — every assignment regardless of project, same as before.
        if ($projectId !== null) {
            $query->where('project_id', $projectId === '' ? null : $projectId);
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
     * knows which one (e.g. a timesheet entry that recorded its role at save time). `$shift`
     * disambiguates further: two assignments can share the same role and differ only by shift
     * (see 2026_08_24_000001_widen_staffing_company_employees_unique_constraint) — without it,
     * `->first()` picks an arbitrary one of the two, silently pointing an hours entry at the
     * wrong assignment's rate. Both are optional so a single-role, single-shift employee stays
     * unambiguous without the caller having to pass them.
     */
    public function assignmentFor(string $employeeId, string $companyId, ?string $projectId, ?string $role, ?string $shift = null): ?StaffingCompanyEmployee
    {
        return StaffingCompanyEmployee::where('employee_id', $employeeId)
            ->where('company_id', $companyId)
            ->when($projectId, fn ($q) => $q->where('project_id', $projectId))
            ->when($role !== null, fn ($q) => $q->where('role', $role))
            ->when($shift !== null, fn ($q) => $q->where('shift', $shift))
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
