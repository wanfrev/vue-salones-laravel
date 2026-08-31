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

            // Two identical assignments (same company/project/role/shift) are indistinguishable to
            // assignmentFor() once saved and make Nómina collide on StaffingTimesheetEntry's unique
            // index. The frontend already blocks them, but the client is not the last line of
            // defense — dedupe here by natural key so a stale/third-party caller can never pile up
            // the literal duplicates that made one worker render several times in the roster.
            $seen = [];
            foreach ($assignments as $assignment) {
                if (empty($assignment['company_id']) || empty($assignment['role'])) {
                    continue;
                }

                $projectId = $assignment['project_id'] ?? null;
                $shift = $assignment['shift'] ?? null;
                $key = $assignment['company_id'] . '::' . ($projectId ?? '') . '::' . trim($assignment['role']) . '::' . ($shift ?? '');

                if (isset($seen[$key])) {
                    continue;
                }
                $seen[$key] = true;

                StaffingCompanyEmployee::create([
                    'id' => Str::uuid()->toString(),
                    'business_id' => $businessId,
                    'company_id' => $assignment['company_id'],
                    'project_id' => $projectId,
                    'employee_id' => $employeeId,
                    'role' => trim($assignment['role']),
                    'shift' => $shift,
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
     *
     * Unlike `active`, which is filtered here (a profile that's inactive everywhere never shows,
     * for any company), a PAUSED assignment (`staffing_company_employees.active = false`) is
     * still returned — this is the one company/project view where that pause should be visible
     * and toggleable, so the row's `active` is overwritten below with the assignment's own flag,
     * not left at the profile's (always-true, since the profile query already filtered on it).
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
                // When this assignment started — Nómina uses it to hide the employee from weeks
                // before they joined this company, instead of showing an empty row for every
                // past week that predates them.
                $row->staffing_assigned_at = $assignment->created_at?->toISOString();
                $row->active = $assignment->active;
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
     * (see 2026_08_24_000001_widen_staffing_company_employees_unique_constraint). `$projectId`
     * disambiguates a third way: a worker can hold the same role at the same company on two
     * different projects at once (each billed/tracked separately).
     *
     * `$shift` and `$projectId` are always applied as real filters — including when they're
     * null — the same way StaffingRateService::resolveFor() treats shift, via `where(col, $val)`
     * (Eloquent turns a null value into `whereNull`). The only caller (StaffingTimesheetService::
     * saveWeek) always sends the timesheet's own project and the grid row's actual shift, and a
     * null there means "this timesheet/assignment has no project" or "no shift split" — not
     * "unknown, don't filter". Skipping either filter on null used to make this fall through to
     * `->first()` picking an arbitrary row whenever a role had more than one matching assignment
     * differing only by project or shift — silently pointing an hours entry at the wrong one, and
     * occasionally resolving two grid rows to the *same* assignment, which then collided on
     * StaffingTimesheetEntry's unique (timesheet_id, employee_id, role, shift) index and made the
     * whole week fail to save. `$role` stays optional (skipped on null) since, unlike project and
     * shift, a caller can genuinely not know it yet for a single-role employee.
     */
    public function assignmentFor(string $employeeId, string $companyId, ?string $projectId, ?string $role, ?string $shift = null): ?StaffingCompanyEmployee
    {
        return StaffingCompanyEmployee::where('employee_id', $employeeId)
            ->where('company_id', $companyId)
            ->where('project_id', $projectId)
            ->when($role !== null, fn ($q) => $q->where('role', $role))
            ->where('shift', $shift)
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

    /**
     * Pauses or reactivates ONE assignment — the Nómina checkbox's target. Scoped to
     * `$businessId` so an assignment id from another tenant can never be toggled through this
     * path; scoped to `$assignmentId` (not employee+company) so a worker holding two roles at the
     * same company can be paused on one role without touching the other.
     */
    public function setActive(string $assignmentId, string $businessId, bool $active): void
    {
        StaffingCompanyEmployee::where('id', $assignmentId)
            ->where('business_id', $businessId)
            ->update(['active' => $active]);
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
