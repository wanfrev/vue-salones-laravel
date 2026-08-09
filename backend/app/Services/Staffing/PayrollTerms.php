<?php

namespace App\Services\Staffing;

/**
 * The rules that apply to a whole payroll run: overtime split, withholding, and how
 * the final payout is rounded. Per-employee amounts live on TimesheetEntry instead.
 */
final class PayrollTerms
{
    /** Drop the cents and keep them on the books. What DYKE does: $852.83 pays out as $852. */
    public const PAYOUT_FLOOR = 'floor';

    /** Round to the nearest cent. */
    public const PAYOUT_CENT = 'cent';

    /** Pay the exact computed amount, fractions of a cent included. */
    public const PAYOUT_EXACT = 'exact';

    public function __construct(
        public readonly TaxRule $taxRule,
        public readonly float $overtimeThresholdHours = 40.0,
        public readonly float $overtimeMultiplier = 1.5,
        public readonly string $payoutRounding = self::PAYOUT_CENT,
    ) {}

    /**
     * DYKE: tiered withholding, whole-dollar payouts. The floor is why every employee
     * on that sheet is paid a few cents short of their net — see PayrollLine::$carried.
     */
    public static function dyke(string $taxDestination = TaxRule::REMITTED): self
    {
        return new self(
            taxRule: TaxRule::dyke($taxDestination),
            payoutRounding: self::PAYOUT_FLOOR,
        );
    }

    /** HILTON: no withholding, exact payouts, deductions handled per employee. */
    public static function withoutWithholding(): self
    {
        return new self(taxRule: TaxRule::none(), payoutRounding: self::PAYOUT_EXACT);
    }
}
