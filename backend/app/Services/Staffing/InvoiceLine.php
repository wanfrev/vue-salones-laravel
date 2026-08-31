<?php

namespace App\Services\Staffing;

/**
 * What the client is charged for one employee's week. Same hours as the PayrollLine,
 * different rate — and, unlike the HILTON (2) sheet, overtime IS billed.
 */
final class InvoiceLine
{
    public function __construct(
        public readonly string $employeeName,
        public readonly float $totalHours,
        public readonly float $regularHours,
        public readonly float $overtimeHours,
        public readonly float $billRate,
        public readonly float $overtimeBillRate,
        public readonly float $regularAmount,
        public readonly float $overtimeAmount,
        /**
         * Passed straight through from the timesheet entry, dollar-for-dollar — unlike perdiem,
         * travel IS billed to the client (see StaffingPayrollCalculator::invoice()). It's already
         * counted as part of employerCost via payroll->net, so adding it here too keeps margin
         * unaffected by it: a true pass-through, not a markup opportunity or a hidden cost.
         */
        public readonly float $travelTotal,
        public readonly float $total,
    ) {}

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'employee_name' => $this->employeeName,
            'total_hours' => $this->totalHours,
            'regular_hours' => $this->regularHours,
            'overtime_hours' => $this->overtimeHours,
            'bill_rate' => $this->billRate,
            'overtime_bill_rate' => $this->overtimeBillRate,
            'regular_amount' => $this->regularAmount,
            'overtime_amount' => $this->overtimeAmount,
            'travel_total' => $this->travelTotal,
            'total' => $this->total,
        ];
    }
}
