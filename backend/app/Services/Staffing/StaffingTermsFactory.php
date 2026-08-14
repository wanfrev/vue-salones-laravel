<?php

namespace App\Services\Staffing;

use App\Models\StaffingCompany;

/**
 * Turns a stored company row into the PayrollTerms the calculator consumes. The only glue
 * between the persistence layer and the pure engine — everything downstream of here is testable
 * without a database.
 */
class StaffingTermsFactory
{
    public function forCompany(StaffingCompany $company): PayrollTerms
    {
        return new PayrollTerms(
            taxRule: $this->taxRuleFor($company),
            // Company-level OT terms were retired in favor of a per-role threshold/multiplier
            // (staffing_company_rates) — every role set through the current UI carries its own,
            // so this pair is only reached as the last-resort default for a role with neither.
            overtimeThresholdHours: 40.0,
            overtimeMultiplier: 1.5,
            payoutRounding: $this->payoutRoundingFor($company),
        );
    }

    /**
     * Tiered brackets win when a company has them (legacy agreements set up before the flat-rate
     * UI existed, e.g. DYKE's 3.5%/7% split). Every company created through the current UI only
     * ever sets `tax_rate` — a flat percentage is just a single-bracket TaxRule.
     */
    private function taxRuleFor(StaffingCompany $company): TaxRule
    {
        $brackets = $this->normalizedBrackets($company->tax_brackets);
        if ($brackets !== []) {
            return TaxRule::tiered($brackets, $this->taxDestinationFor($company));
        }

        $rate = (float) ($company->tax_rate ?? 0.0);
        if ($rate <= 0.0) {
            return TaxRule::none();
        }

        return TaxRule::flat($rate, $this->taxDestinationFor($company));
    }

    /** @return list<array{threshold: float|null, rate: float}> */
    private function normalizedBrackets(mixed $brackets): array
    {
        if (!is_array($brackets) || $brackets === []) {
            return [];
        }

        $normalized = [];
        foreach ($brackets as $bracket) {
            if (!is_array($bracket) || !array_key_exists('rate', $bracket)) {
                continue;
            }
            $threshold = $bracket['threshold'] ?? null;
            $normalized[] = [
                'threshold' => $threshold === null ? null : (float) $threshold,
                'rate' => (float) $bracket['rate'],
            ];
        }

        return $normalized;
    }

    private function taxDestinationFor(StaffingCompany $company): string
    {
        return $company->tax_destination === TaxRule::RETAINED
            ? TaxRule::RETAINED
            : TaxRule::REMITTED;
    }

    /** Unrecognised values fall back to cent rounding — the least surprising of the three. */
    private function payoutRoundingFor(StaffingCompany $company): string
    {
        return match ($company->payout_rounding) {
            PayrollTerms::PAYOUT_FLOOR => PayrollTerms::PAYOUT_FLOOR,
            PayrollTerms::PAYOUT_EXACT => PayrollTerms::PAYOUT_EXACT,
            default => PayrollTerms::PAYOUT_CENT,
        };
    }
}
