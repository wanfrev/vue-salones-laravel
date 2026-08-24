<?php

namespace App\Services\Staffing;

use App\Models\Profile;
use App\Models\StaffingTimesheet;
use App\Models\StaffingTimesheetEntry;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Turns a week of hours into the persisted payroll+invoice numbers, using the pure
 * StaffingPayrollCalculator underneath. This class owns everything the calculator doesn't:
 * finding/creating the right week, resolving each employee's rate off the company's rate card,
 * and freezing the numbers once a week is approved.
 */
class StaffingTimesheetService
{
    public function __construct(
        private StaffingCompanyService $companies,
        private StaffingRateService $rates,
        private StaffingTermsFactory $termsFactory,
        private StaffingPayrollCalculator $calculator,
        private StaffingCompanyEmployeeService $companyEmployees,
    ) {}

    public function list(string $businessId, ?string $companyId = null, ?string $projectId = null): Collection
    {
        $query = StaffingTimesheet::with(['entries.employee', 'project'])
            ->where('business_id', $businessId)
            ->orderByDesc('week_start');

        if ($companyId) {
            $query->where('company_id', $companyId);
            // Scoped to one company (the Nómina hours-entry view): match the project tab exactly,
            // including "General" (null) — mirrors saveWeek's find-or-create lookup so the week a
            // user sees here is always the same record a save would touch. An unscoped business-
            // wide listing (no companyId) keeps returning everything, project or not.
            $query->where('project_id', $projectId);
        }

        return $query->get();
    }

    /**
     * The employees available to load hours for on a given company — active and currently
     * assigned there. An employee can be assigned to more than one company at once; this only
     * returns the ones assigned to *this* one, each carrying their role at this company.
     */
    public function employeesForCompany(string $businessId, string $companyId, ?string $projectId = null): Collection
    {
        return $this->companyEmployees->employeesForCompany($businessId, $companyId, $projectId);
    }

    /**
     * Create or update the draft for (company, week) and replace its entries wholesale — the
     * caller always sends the full set of hours for that week, matching how the sheet is edited
     * (one grid, re-saved). Every entry is recomputed through the same calculator that reproduces
     * the DYKE/HILTON/CWT spreadsheets exactly.
     *
     * @param list<array{employee_id: string, total_hours: float, pre_tax_deduction?: float, fixed_fees?: float, adjustment?: float}> $entries
     */
    public function saveWeek(
        string $businessId,
        string $companyId,
        ?string $projectId,
        string $weekStart,
        string $weekEnd,
        array $entries,
        ?string $createdBy = null,
    ): StaffingTimesheet {
        $company = $this->companies->findForBusiness($companyId, $businessId);

        return DB::transaction(function () use ($businessId, $company, $projectId, $weekStart, $weekEnd, $entries, $createdBy) {
            $timesheet = StaffingTimesheet::where('business_id', $businessId)
                ->where('company_id', $company->id)
                ->where('project_id', $projectId)
                ->where('week_start', $weekStart)
                ->first();

            if ($timesheet && !$timesheet->isDraft()) {
                throw new RuntimeException('Esta semana ya fue aprobada. Reábrela antes de editar las horas.');
            }

            if (!$timesheet) {
                $timesheet = StaffingTimesheet::create([
                    'id' => Str::uuid()->toString(),
                    'business_id' => $businessId,
                    'company_id' => $company->id,
                    'project_id' => $projectId,
                    'week_start' => $weekStart,
                    'week_end' => $weekEnd,
                    'status' => StaffingTimesheet::STATUS_DRAFT,
                    'created_by' => $createdBy,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $terms = $this->termsFactory->forCompany($company);

            // Fail closed: a role with no rate card entry would otherwise silently compute a
            // $0 wage and a $0 bill — the sheets' equivalent of paying someone nothing without
            // anyone noticing. Collect every problem before throwing so the admin fixes the
            // whole rate card in one pass instead of one entry at a time.
            $missing = [];
            $lines = [];
            foreach ($entries as $entryInput) {
                $employee = Profile::find($entryInput['employee_id']);
                if (!$employee || $employee->business_id !== $businessId) {
                    throw new NotFoundHttpException('Empleado no encontrado.');
                }

                // The role — and therefore the rate — is per (employee, company), not a single
                // value on the profile: the same person can hold a different role at another
                // client company they're also assigned to. Shift works the same way: fixed on
                // the assignment, not chosen per week, for companies that split a role's pay by
                // día/tarde/noche.
                $role = $this->companyEmployees->roleForEmployeeAtCompany($employee->id, $company->id, $projectId);
                $shift = $this->companyEmployees->shiftForEmployeeAtCompany($employee->id, $company->id, $projectId);

                $rate = $this->rates->resolveFor($businessId, $company->id, $role, $shift);
                if (!$rate) {
                    $missing[] = $employee->full_name . ' (' . ($role ?: 'sin rol') . ')';
                    continue;
                }

                $lines[] = [
                    'employee' => $employee,
                    'rate' => $rate,
                    'input' => $entryInput,
                ];
            }

            if ($missing !== []) {
                throw new RuntimeException(
                    'Falta la tarifa de estos empleados en la empresa: ' . implode(', ', $missing) . '.'
                );
            }

            StaffingTimesheetEntry::where('timesheet_id', $timesheet->id)->delete();

            foreach ($lines as $line) {
                $employee = $line['employee'];
                $rate = $line['rate'];
                $input = $line['input'];

                // A manually set staffing_tax_rate replaces the company's tiered brackets with
                // a single flat rate for this employee only; the destination (remitted/kept by
                // the agency) still follows the company's agreement.
                $taxOverride = $employee->staffing_tax_rate !== null
                    ? TaxRule::flat((float) $employee->staffing_tax_rate, $terms->taxRule->destination)
                    : null;

                $timesheetEntry = new TimesheetEntry(
                    employeeName: $employee->full_name,
                    totalHours: (float) $input['total_hours'],
                    payRate: $rate->pay_rate,
                    billRate: $rate->bill_rate,
                    preTaxDeduction: (float) ($input['pre_tax_deduction'] ?? 0),
                    fixedFees: (float) ($input['fixed_fees'] ?? 0),
                    adjustment: (float) ($input['adjustment'] ?? 0),
                    taxOverride: $taxOverride,
                    overtimeThresholdOverride: $rate->overtime_threshold_hours,
                    overtimeMultiplierOverride: $rate->overtime_multiplier,
                    overtimePayRateOverride: $rate->overtime_pay_rate,
                    overtimeBillRateOverride: $rate->overtime_bill_rate,
                );

                $result = $this->calculator->line($timesheetEntry, $terms);

                StaffingTimesheetEntry::create([
                    'id' => Str::uuid()->toString(),
                    'business_id' => $businessId,
                    'timesheet_id' => $timesheet->id,
                    'employee_id' => $employee->id,
                    'total_hours' => $timesheetEntry->totalHours,
                    'pre_tax_deduction' => $timesheetEntry->preTaxDeduction,
                    'fixed_fees' => $timesheetEntry->fixedFees,
                    'adjustment' => $timesheetEntry->adjustment,
                    'pay_rate' => $rate->pay_rate,
                    'bill_rate' => $rate->bill_rate,
                    'regular_hours' => $result->payroll->regularHours,
                    'overtime_hours' => $result->payroll->overtimeHours,
                    'gross' => $result->payroll->gross,
                    'tax_withheld' => $result->payroll->taxWithheld,
                    'net' => $result->payroll->net,
                    'payout' => $result->payroll->payout,
                    'carried' => $result->payroll->carried,
                    'invoice_total' => $result->invoice->total,
                    'invoice_regular_amount' => $result->invoice->regularAmount,
                    'invoice_overtime_amount' => $result->invoice->overtimeAmount,
                    'employer_cost' => $result->employerCost,
                    'margin' => $result->margin,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return $timesheet->fresh(['entries.employee']);
        });
    }

    /**
     * Freezes the company's current rules onto the timesheet so a later change to its tax
     * brackets or overtime terms can never rewrite payroll that was already approved.
     */
    public function approve(string $id, string $businessId): StaffingTimesheet
    {
        $timesheet = $this->findForBusiness($id, $businessId);

        if (!$timesheet->isDraft()) {
            throw new RuntimeException('Esta semana ya fue aprobada.');
        }
        if ($timesheet->entries()->count() === 0) {
            throw new RuntimeException('No hay horas cargadas para esta semana.');
        }

        $company = $timesheet->company;

        $timesheet->update([
            'status' => StaffingTimesheet::STATUS_APPROVED,
            'terms_snapshot' => [
                // Overtime terms are per-role now (staffing_company_rates), already frozen onto
                // each entry via regular_hours/overtime_hours — nothing company-wide left to
                // snapshot here.
                'tax_brackets' => $company->tax_brackets,
                'tax_rate' => $company->tax_rate,
                'tax_destination' => $company->tax_destination,
                'payout_rounding' => $company->payout_rounding,
            ],
            'updated_at' => now(),
        ]);

        return $timesheet->fresh(['entries.employee']);
    }

    /** Marks an approved week's payroll as actually paid out to the employees. */
    public function markPaid(string $id, string $businessId): StaffingTimesheet
    {
        $timesheet = $this->findForBusiness($id, $businessId);

        if ($timesheet->status !== StaffingTimesheet::STATUS_APPROVED) {
            throw new RuntimeException('Solo una semana aprobada puede marcarse como pagada.');
        }

        $timesheet->update([
            'status' => StaffingTimesheet::STATUS_PAID,
            'updated_at' => now(),
        ]);

        return $timesheet->fresh(['entries.employee']);
    }

    public function destroy(string $id, string $businessId): void
    {
        $timesheet = $this->findForBusiness($id, $businessId);

        if (!$timesheet->isDraft()) {
            throw new RuntimeException('Solo se puede eliminar una semana en borrador.');
        }

        $timesheet->delete();
    }

    public function findForBusiness(string $id, string $businessId): StaffingTimesheet
    {
        $timesheet = StaffingTimesheet::with(['entries.employee'])->find($id);
        if (!$timesheet || $timesheet->business_id !== $businessId) {
            throw new NotFoundHttpException('Semana no encontrada.');
        }

        return $timesheet;
    }
}
