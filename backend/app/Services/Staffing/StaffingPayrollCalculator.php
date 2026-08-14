<?php

namespace App\Services\Staffing;

/**
 * The staffing calculation engine: hours in, payroll + invoice + margin out.
 *
 * Deliberately free of the database, the request, and Eloquent — every input arrives as a
 * TimesheetEntry and PayrollTerms, so the arithmetic can be tested against the real
 * spreadsheets without a schema existing yet. Persistence sits on top of this, not inside it.
 *
 * Precision follows the sheets exactly. The payroll chain carries full double precision and
 * rounds only at payout, because that is what Excel does — rounding the intermediates would
 * drift a few cents off the amounts already paid to real people. The invoice chain rounds
 * each amount to the cent, because the CWT sheet wraps every cell in ROUND(...,2).
 */
class StaffingPayrollCalculator
{
    /** Split total hours the way both sheets do: `IF(hours < threshold, hours, threshold)`. */
    private function splitHours(float $totalHours, TimesheetEntry $entry, PayrollTerms $terms): array
    {
        $threshold = $entry->overtimeThresholdOverride ?? $terms->overtimeThresholdHours;

        $regular = $totalHours < $threshold ? $totalHours : $threshold;

        return [$regular, $totalHours - $regular];
    }

    /** The role's own override, when the rate card sets one, otherwise the company's terms. */
    private function overtimeMultiplierFor(TimesheetEntry $entry, PayrollTerms $terms): float
    {
        return $entry->overtimeMultiplierOverride ?? $terms->overtimeMultiplier;
    }

    /** The employee's own tax override, when set, otherwise the company's rule. */
    private function taxRuleFor(TimesheetEntry $entry, PayrollTerms $terms): TaxRule
    {
        return $entry->taxOverride ?? $terms->taxRule;
    }

    public function payroll(TimesheetEntry $entry, PayrollTerms $terms): PayrollLine
    {
        [$regularHours, $overtimeHours] = $this->splitHours($entry->totalHours, $entry, $terms);

        // An explicit OT pay rate wins outright — it's exactly what was agreed, not payRate
        // times some multiplier that may not reflect the real OT margin.
        $overtimeRate = $entry->overtimePayRateOverride ?? ($entry->payRate * $this->overtimeMultiplierFor($entry, $terms));
        $regularAmount = $regularHours * $entry->payRate;
        $overtimeAmount = $overtimeHours * $overtimeRate;

        $gross = $regularAmount + $overtimeAmount - $entry->preTaxDeduction;
        $tax = $this->taxRuleFor($entry, $terms)->amountFor($gross);
        $net = $gross - $tax - $entry->fixedFees + $entry->adjustment;

        $payout = $this->roundPayout($net, $terms->payoutRounding);

        return new PayrollLine(
            employeeName: $entry->employeeName,
            totalHours: $entry->totalHours,
            regularHours: $regularHours,
            overtimeHours: $overtimeHours,
            payRate: $entry->payRate,
            overtimeRate: $overtimeRate,
            regularAmount: $regularAmount,
            overtimeAmount: $overtimeAmount,
            gross: $gross,
            taxWithheld: $tax,
            feesWithheld: $entry->fixedFees,
            adjustment: $entry->adjustment,
            net: $net,
            payout: $payout,
            carried: $net - $payout,
        );
    }

    /**
     * Whole-dollar rounding never applies to a negative net. Flooring -$1.20 to -$2.00 would
     * quietly deepen what the employee owes; those lines round to the cent instead.
     */
    private function roundPayout(float $net, string $mode): float
    {
        if ($mode === PayrollTerms::PAYOUT_EXACT) {
            return $net;
        }
        if ($mode === PayrollTerms::PAYOUT_FLOOR && $net > 0) {
            return floor($net);
        }

        return round($net, 2);
    }

    public function invoice(TimesheetEntry $entry, PayrollTerms $terms): InvoiceLine
    {
        [$regularHours, $overtimeHours] = $this->splitHours($entry->totalHours, $entry, $terms);

        // Independent of overtimePayRateOverride above — OT margin is not always proportional
        // to regular margin, so this must never be derived from the pay-side rate or multiplier.
        // The override is rounded too (not trusted as already-clean): every other amount in this
        // chain is cent-rounded, and a typed dollar value can carry stray precision.
        $overtimeBillRate = $entry->overtimeBillRateOverride !== null
            ? round($entry->overtimeBillRateOverride, 2)
            : round($entry->billRate * $this->overtimeMultiplierFor($entry, $terms), 2);
        $regularAmount = round($entry->billRate * $regularHours, 2);
        $overtimeAmount = round($overtimeHours * $overtimeBillRate, 2);

        return new InvoiceLine(
            employeeName: $entry->employeeName,
            totalHours: $entry->totalHours,
            regularHours: $regularHours,
            overtimeHours: $overtimeHours,
            billRate: $entry->billRate,
            overtimeBillRate: $overtimeBillRate,
            regularAmount: $regularAmount,
            overtimeAmount: $overtimeAmount,
            total: round($regularAmount + $overtimeAmount, 2),
        );
    }

    public function line(TimesheetEntry $entry, PayrollTerms $terms): StaffingLine
    {
        $payroll = $this->payroll($entry, $terms);
        $invoice = $this->invoice($entry, $terms);

        // Everything withheld leaves the agency along with the net, except a withholding the
        // agreement lets the agency keep — that one was never an outflow.
        $retained = $this->taxRuleFor($entry, $terms)->isRetainedByAgency() ? $payroll->taxWithheld : 0.0;
        $employerCost = $payroll->net + $payroll->taxWithheld + $payroll->feesWithheld - $retained;

        return new StaffingLine(
            payroll: $payroll,
            invoice: $invoice,
            employerCost: $employerCost,
            margin: $invoice->total - $employerCost,
        );
    }

    /** @param list<TimesheetEntry> $entries */
    public function run(array $entries, PayrollTerms $terms): StaffingRun
    {
        return new StaffingRun(array_map(
            fn (TimesheetEntry $entry) => $this->line($entry, $terms),
            $entries,
        ));
    }
}
