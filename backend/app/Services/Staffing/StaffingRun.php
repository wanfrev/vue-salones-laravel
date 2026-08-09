<?php

namespace App\Services\Staffing;

/** One week, one project: every employee line plus the totals row from the bottom of the sheets. */
final class StaffingRun
{
    /** @param list<StaffingLine> $lines */
    public function __construct(public readonly array $lines) {}

    private function sum(callable $field): float
    {
        return array_sum(array_map($field, $this->lines));
    }

    public function totalHours(): float
    {
        return $this->sum(fn (StaffingLine $l) => $l->payroll->totalHours);
    }

    public function totalOvertimeHours(): float
    {
        return $this->sum(fn (StaffingLine $l) => $l->payroll->overtimeHours);
    }

    public function totalGross(): float
    {
        return $this->sum(fn (StaffingLine $l) => $l->payroll->gross);
    }

    public function totalTaxWithheld(): float
    {
        return $this->sum(fn (StaffingLine $l) => $l->payroll->taxWithheld);
    }

    public function totalNet(): float
    {
        return $this->sum(fn (StaffingLine $l) => $l->payroll->net);
    }

    public function totalPayout(): float
    {
        return $this->sum(fn (StaffingLine $l) => $l->payroll->payout);
    }

    /** Cents held back across the whole run by whole-dollar rounding. Still owed. */
    public function totalCarried(): float
    {
        return $this->sum(fn (StaffingLine $l) => $l->payroll->carried);
    }

    public function totalInvoiced(): float
    {
        return $this->sum(fn (StaffingLine $l) => $l->invoice->total);
    }

    public function totalEmployerCost(): float
    {
        return $this->sum(fn (StaffingLine $l) => $l->employerCost);
    }

    public function totalMargin(): float
    {
        return $this->sum(fn (StaffingLine $l) => $l->margin);
    }

    public function marginPercent(): float
    {
        $invoiced = $this->totalInvoiced();

        return $invoiced > 0.0 ? $this->totalMargin() / $invoiced * 100 : 0.0;
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'lines' => array_map(fn (StaffingLine $l) => $l->toArray(), $this->lines),
            'totals' => [
                'hours' => round($this->totalHours(), 2),
                'overtime_hours' => round($this->totalOvertimeHours(), 2),
                'gross' => round($this->totalGross(), 2),
                'tax_withheld' => round($this->totalTaxWithheld(), 2),
                'net' => round($this->totalNet(), 2),
                'payout' => round($this->totalPayout(), 2),
                'carried' => round($this->totalCarried(), 2),
                'invoiced' => round($this->totalInvoiced(), 2),
                'employer_cost' => round($this->totalEmployerCost(), 2),
                'margin' => round($this->totalMargin(), 2),
                'margin_percent' => round($this->marginPercent(), 2),
            ],
        ];
    }
}
