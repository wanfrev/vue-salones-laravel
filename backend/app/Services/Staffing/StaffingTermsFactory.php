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
            overtimeThresholdHours: $company->overtime_threshold_hours ?: 40.0,
            overtimeMultiplier: $company->overtime_multiplier ?: 1.5,
            payoutRounding: $this->payoutRoundingFor($company),
        );
    }

    private function taxRuleFor(StaffingCompany $company): TaxRule
    {
        $brackets = $company->tax_brackets;

        // Null and [] both mean "this client withholds nothing" — the HILTON case.
        if (!is_array($brackets) || $brackets === []) {
            return TaxRule::none();
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

        if ($normalized === []) {
            return TaxRule::none();
        }

        return TaxRule::tiered($normalized, $this->taxDestinationFor($company));
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
