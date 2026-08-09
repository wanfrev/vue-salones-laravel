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
    ) {
        if ($totalHours < 0) {
            throw new InvalidArgumentException("Negative hours for {$employeeName}: {$totalHours}");
        }
        if ($payRate < 0 || $billRate < 0) {
            throw new InvalidArgumentException("Negative rate for {$employeeName}");
        }
    }
}
