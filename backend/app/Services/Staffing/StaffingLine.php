<?php

namespace App\Services\Staffing;

/**
 * The two halves of one employee-week joined together, plus the spread between them.
 * This is the `HILTON (2)` sheet done right: TOTAL PAY next to TOTAL INVOICE, with
 * overtime billed on both sides.
 */
final class StaffingLine
{
    public function __construct(
        public readonly PayrollLine $payroll,
        public readonly InvoiceLine $invoice,
        /**
         * What the week actually costs the agency. Everything withheld from the employee
         * still leaves the building — the tax to whoever collects it, the fee to the card
         * processor — UNLESS the agreement says the agency keeps the withholding, in which
         * case it never was a cost. See TaxRule::RETAINED.
         */
        public readonly float $employerCost,
        /** invoice total − employer cost. The reason the agency exists. */
        public readonly float $margin,
    ) {}

    /** Margin as a share of what was invoiced. Zero-billed weeks report 0.0, not a division error. */
    public function marginPercent(): float
    {
        return $this->invoice->total > 0.0
            ? $this->margin / $this->invoice->total * 100
            : 0.0;
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'employee_name' => $this->payroll->employeeName,
            'payroll' => $this->payroll->toArray(),
            'invoice' => $this->invoice->toArray(),
            'employer_cost' => round($this->employerCost, 2),
            'margin' => round($this->margin, 2),
            'margin_percent' => round($this->marginPercent(), 2),
        ];
    }
}
