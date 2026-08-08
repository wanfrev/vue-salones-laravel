<?php

namespace App\Services\Staffing;

/**
 * The `%` column of the payroll sheets: a percentage withheld from the employee's
 * gross weekly pay.
 *
 * Two things about it are unusual and deliberate, both taken from the live sheets:
 *
 * 1. The rate is NOT marginal. The bracket selects one rate and that rate applies to
 *    the whole base — `IF(M15<500, M15*3.5%, M15*7%)`. This creates a cliff at the
 *    boundary: $499 gross nets $481.53, $501 gross nets $465.93. Earning $2 more
 *    costs the employee $15.60. That is what the sheets do today, so the engine
 *    reproduces it; it is not a bug in this class.
 *
 * 2. Where the money ends up is per-agreement, not universal. When it is a real
 *    withholding it leaves the agency as a tax liability; when it is a service fee
 *    the agency keeps it and it lifts the margin. See self::REMITTED / self::RETAINED
 *    — StaffingPayrollCalculator reads this to decide the employer cost.
 */
final class TaxRule
{
    /** Withheld on behalf of a third party. Leaves the agency; margin unaffected. */
    public const REMITTED = 'remitted';

    /** Kept by the agency as a service fee. Never leaves; adds to the margin. */
    public const RETAINED = 'retained';

    /**
     * @param list<array{threshold: float|null, rate: float}> $brackets
     *        Ordered. `threshold` is an EXCLUSIVE upper bound on the base; the first
     *        bracket whose bound the base falls under wins. A null threshold is the
     *        catch-all and must be last.
     */
    private function __construct(
        public readonly array $brackets,
        public readonly string $destination,
    ) {}

    /** No withholding at all — the HILTON sheet, where the `%` column was left empty. */
    public static function none(): self
    {
        return new self([], self::REMITTED);
    }

    /** A single rate on every dollar, regardless of amount. */
    public static function flat(float $rate, string $destination): self
    {
        return new self([['threshold' => null, 'rate' => $rate]], $destination);
    }

    /**
     * @param list<array{threshold: float|null, rate: float}> $brackets
     */
    public static function tiered(array $brackets, string $destination): self
    {
        return new self($brackets, $destination);
    }

    /** The DYKE agreement: 3.5% under $500, 7% from $500 up. */
    public static function dyke(string $destination = self::REMITTED): self
    {
        return self::tiered([
            ['threshold' => 500.0, 'rate' => 0.035],
            ['threshold' => null, 'rate' => 0.07],
        ], $destination);
    }

    public function amountFor(float $base): float
    {
        foreach ($this->brackets as $bracket) {
            if ($bracket['threshold'] === null || $base < $bracket['threshold']) {
                return $base * $bracket['rate'];
            }
        }

        return 0.0;
    }

    public function isRetainedByAgency(): bool
    {
        return $this->destination === self::RETAINED;
    }
}
