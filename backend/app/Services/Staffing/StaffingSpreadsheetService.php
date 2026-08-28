<?php

namespace App\Services\Staffing;

use App\Models\Profile;
use App\Models\StaffingCompany;
use Illuminate\Support\Collection;

/**
 * Backs the "Spreadsheet" module: a vendedora (or admin) picks a client company, picks some of
 * its staffed employees, and gets a bill-rate sheet to hand to that client. Every method here is
 * deliberately narrow — it exists so a vendedora-reachable endpoint never has to touch the full
 * rate card (which carries pay_rate) or the full company record (overhead/tax internals).
 */
class StaffingSpreadsheetService
{
    public function __construct(
        private StaffingCompanyEmployeeService $companyEmployees,
        private StaffingRateService $rates,
    ) {}

    /**
     * The same "vendedora" population as LeadService::vendedoraRoster() (a plain empleado/encargado
     * never staffed to a client company), annotated with whether they already have Spreadsheet
     * access — this IS the access-management list the admin uses inside the module itself.
     *
     * @return list<array{id: string, name: string, canAccessSpreadsheet: bool}>
     */
    public function vendedoraRoster(string $businessId): array
    {
        return Profile::query()
            ->where('business_id', $businessId)
            ->whereIn('role', ['empleado', 'encargado'])
            ->whereDoesntHave('staffingCompanyEmployees')
            ->orderBy('full_name')
            ->get(['id', 'full_name', 'can_access_spreadsheet'])
            ->map(fn (Profile $p) => [
                'id' => $p->id,
                'name' => $p->full_name,
                'canAccessSpreadsheet' => (bool) $p->can_access_spreadsheet,
            ])
            ->all();
    }

    /**
     * Company picker for the module — id/name only. Deliberately not the full StaffingCompany
     * record: agency_overhead_rate/tax_rate/tax_brackets are internal agency economics, not
     * something a vendedora handing a rate sheet to the client needs to see.
     *
     * @return list<array{id: string, name: string}>
     */
    public function companies(string $businessId): array
    {
        return StaffingCompany::query()
            ->where('business_id', $businessId)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (StaffingCompany $c) => ['id' => $c->id, 'name' => $c->name])
            ->all();
    }

    /**
     * Employees staffed at this company with their BILL rate only (never pay_rate — that's what
     * the agency pays, not what the client is charged, and this data ends up on a client-facing
     * PDF). Joins the roster (one row per assignment) to the rate card by role+shift, exactly like
     * StaffingHoursPanel.vue's rateFor(), then dedupes by employee: the same person holding the
     * same role across several of this company's projects only needs to appear once in a sheet
     * meant to be handed to the client as "who's staffed here and at what rate".
     *
     * @return list<array{employeeId: string, name: string, role: string, shift: ?string, billRate: ?float, overtimeBillRate: ?float}>
     */
    public function companyEmployeeRates(string $businessId, string $companyId): array
    {
        $roster = $this->companyEmployees->employeesForCompany($businessId, $companyId);
        $rateCard = $this->rates->list($businessId, $companyId);

        $rateFor = function (?string $role, ?string $shift) use ($rateCard) {
            return $rateCard->first(fn ($r) => $r->role === $role && $r->shift === $shift);
        };

        return $roster
            ->unique('id')
            ->map(function (Profile $employee) use ($rateFor) {
                $rate = $rateFor($employee->staffing_role, $employee->staffing_shift);

                return [
                    'employeeId' => $employee->id,
                    'name' => $employee->full_name,
                    'role' => $employee->staffing_role,
                    'shift' => $employee->staffing_shift,
                    'billRate' => $rate?->bill_rate !== null ? (float) $rate->bill_rate : null,
                    'overtimeBillRate' => $rate?->overtime_bill_rate !== null ? (float) $rate->overtime_bill_rate : null,
                ];
            })
            ->sortBy('name')
            ->values()
            ->all();
    }
}
