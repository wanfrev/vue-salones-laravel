<?php

namespace App\Services\Staffing;

/** What the agency owes one employee for one week. Mirrors the NOMINA sheet, column by column. */
final class PayrollLine
{
    public function __construct(
        public readonly string $employeeName,
        public readonly float $totalHours,
        public readonly float $regularHours,
        public readonly float $overtimeHours,
        public readonly float $payRate,
        public readonly float $overtimeRate,
        public readonly float $regularAmount,
        public readonly float $overtimeAmount,
        /** `TOTAL WEEKLY` — reg + OT, minus any pre-tax deduction. The base for withholding. */
        public readonly float $gross,
        public readonly float $taxWithheld,
        public readonly float $feesWithheld,
        public readonly float $adjustment,
        /** Reimbursement-style amounts folded into `net` below but never billed on the invoice. */
        public readonly float $perdiemTotal,
        public readonly float $travelTotal,
        /** `TOTAL` — the exact amount owed, unrounded. */
        public readonly float $net,
        /** The amount actually transferred, after PayrollTerms' rounding. */
        public readonly float $payout,
        /**
         * `net - payout`: cents held back by whole-dollar rounding. Small per line, but it
         * is money still owed to the employee, so it is surfaced rather than discarded.
         */
        public readonly float $carried,
    ) {}

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'employee_name' => $this->employeeName,
            'total_hours' => $this->totalHours,
            'regular_hours' => $this->regularHours,
            'overtime_hours' => $this->overtimeHours,
            'pay_rate' => $this->payRate,
            'overtime_rate' => $this->overtimeRate,
            'regular_amount' => round($this->regularAmount, 2),
            'overtime_amount' => round($this->overtimeAmount, 2),
            'gross' => round($this->gross, 2),
            'tax_withheld' => round($this->taxWithheld, 2),
            'fees_withheld' => round($this->feesWithheld, 2),
            'adjustment' => round($this->adjustment, 2),
            'perdiem_total' => round($this->perdiemTotal, 2),
            'travel_total' => round($this->travelTotal, 2),
            'net' => round($this->net, 2),
            'payout' => round($this->payout, 2),
            'carried' => round($this->carried, 2),
        ];
    }
}
