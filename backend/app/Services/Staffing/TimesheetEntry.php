<?php

namespace App\Services\Staffing;

use InvalidArgumentException;

/**
 * One employee's week on one project — the single row that feeds both the payroll and
 * the invoice.
 *
 * The two rates are the whole business. `payRate` is the `HOURLY WAGE` column, what the
 * employee earns. `billRate` is the `COMPANY` column, what the client is charged for the
 * same hour. Both are per employee AND per project: the CWT invoice bills one worker at
 * $21 and another at $23 on the same site in the same week, so neither rate can live on
 * the employee record or on the project alone.
 */
final class TimesheetEntry
{
    public function __construct(
        public readonly string $employeeName,
        public readonly float $totalHours,
        public readonly float $payRate,
        public readonly float $billRate,
        /** `TRANSPORTE` — comes off the gross BEFORE withholding is computed. */
        public readonly float $preTaxDeduction = 0.0,
        /** `RAPID` — flat card/processing fee, taken AFTER withholding. */
        public readonly float $fixedFees = 0.0,
        /** `AJUSTE` / `OSHA` — signed correction applied last. Negative claws money back. */
        public readonly float $adjustment = 0.0,
        /** `DD` for direct deposit, otherwise the payroll card number. */
        public readonly ?string $paymentMethod = null,
        public readonly ?string $employeeId = null,
        /**
         * Per-employee override of PayrollTerms::$taxRule — set when profiles.staffing_tax_rate
         * is not null. Null here means "use the company's rule", the previous behaviour.
         */
        public readonly ?TaxRule $taxOverride = null,
        /**
         * Per-role override of PayrollTerms::$overtimeThresholdHours / $overtimeMultiplier — set
         * when the rate card row (staffing_company_rates) carries its own OT terms. Null means
         * "use the company's terms", the previous (and still default) behaviour.
         */
        public readonly ?float $overtimeThresholdOverride = null,
        public readonly ?float $overtimeMultiplierOverride = null,
        /**
         * Per-role explicit OT $/hour — set when the rate card row carries its own
         * overtime_pay_rate/overtime_bill_rate, independent of each other and of any multiplier.
         * A company's OT margin is not always proportional to its regular margin, so deriving
         * the bill rate from the pay rate's ratio (or vice versa) can silently over/under-bill —
         * these two exist so each side is exactly what was agreed, not a derived approximation.
         */
        public readonly ?float $overtimePayRateOverride = null,
        public readonly ?float $overtimeBillRateOverride = null,
        /**
         * When true, `regularHours`/`overtimeHours` below replace StaffingPayrollCalculator's
         * threshold-based split entirely — e.g. all-OT weeks with zero regular hours, which the
         * threshold split can never produce on its own.
         */
        public readonly bool $hoursManualOverride = false,
        public readonly ?float $manualRegularHours = null,
        public readonly ?float $manualOvertimeHours = null,
        /**
         * Per diem and travel pay — reimbursement-style amounts paid to the employee, folded
         * into payroll's `net`/`payout` in StaffingPayrollCalculator::payroll(). Per diem is
         * never billed to the client; travel IS (StaffingPayrollCalculator::invoice() bills it
         * dollar-for-dollar, a pass-through that leaves margin unaffected).
         */
        public readonly float $perdiemTotal = 0.0,
        public readonly float $travelTotal = 0.0,
    ) {
        if ($totalHours < 0) {
            throw new InvalidArgumentException("Negative hours for {$employeeName}: {$totalHours}");
        }
        if ($payRate < 0 || $billRate < 0) {
            throw new InvalidArgumentException("Negative rate for {$employeeName}");
        }
        if ($hoursManualOverride && (($manualRegularHours ?? 0) < 0 || ($manualOvertimeHours ?? 0) < 0)) {
            throw new InvalidArgumentException("Negative manual hours for {$employeeName}");
        }
    }
}
