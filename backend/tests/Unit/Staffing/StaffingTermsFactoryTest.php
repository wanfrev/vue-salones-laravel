<?php

namespace Tests\Unit\Staffing;

use App\Models\StaffingCompany;
use App\Services\Staffing\PayrollTerms;
use App\Services\Staffing\StaffingPayrollCalculator;
use App\Services\Staffing\StaffingTermsFactory;
use App\Services\Staffing\TaxRule;
use App\Services\Staffing\TimesheetEntry;
use Tests\TestCase;

/**
 * The stored-configuration half of the engine: a company row has to produce the same terms the
 * hand-built PayrollTerms did, or the spreadsheet parity proven in StaffingPayrollCalculatorTest
 * stops meaning anything once the numbers come from the database.
 *
 * Models are instantiated, never saved — casts apply on attribute access, so no DB is needed.
 */
class StaffingTermsFactoryTest extends TestCase
{
    private const TOLERANCE = 1e-9;

    private StaffingTermsFactory $factory;
    private StaffingPayrollCalculator $calculator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->factory = new StaffingTermsFactory();
        $this->calculator = new StaffingPayrollCalculator();
    }

    private function company(array $attributes = []): StaffingCompany
    {
        return new StaffingCompany(array_merge([
            'name' => 'DYKE INDUSTRIES',
            'overtime_threshold_hours' => 40,
            'overtime_multiplier' => 1.5,
            'tax_brackets' => [
                ['threshold' => 500, 'rate' => 0.035],
                ['threshold' => null, 'rate' => 0.07],
            ],
            'tax_destination' => TaxRule::REMITTED,
            'payout_rounding' => PayrollTerms::PAYOUT_FLOOR,
        ], $attributes));
    }

    /** The whole DYKE week, driven off a stored row instead of PayrollTerms::dyke(). */
    public function test_a_stored_company_reproduces_the_dyke_spreadsheet(): void
    {
        $terms = $this->factory->forCompany($this->company());

        $entries = [
            new TimesheetEntry('ADAN HERNANDEZ', 54.09, 15.0, 20.0),
            new TimesheetEntry('ARAEL WALTERS', 32.11, 13.0, 18.0),
            new TimesheetEntry('ISAI ALARCON', 48.36, 13.0, 18.0),
            new TimesheetEntry('MARLA GONZALEZ', 39.59, 13.0, 18.0),
            new TimesheetEntry('JOSE CHAVEZ', 44.45, 13.0, 18.0),
            new TimesheetEntry('PEPE ESCALENTE', 54.23, 13.0, 18.0),
        ];

        $run = $this->calculator->run($entries, $terms);

        $this->assertEqualsWithDelta(3936.4050000000007, $run->totalGross(), self::TOLERANCE, 'M23');
        $this->assertEqualsWithDelta(260.9383, $run->totalTaxWithheld(), self::TOLERANCE, 'N23');
        $this->assertEqualsWithDelta(3675.4667, $run->totalNet(), self::TOLERANCE, 'O23');
        $this->assertEqualsWithDelta(3672.0, $run->totalPayout(), self::TOLERANCE, 'Q23');
    }

    public function test_json_brackets_survive_string_values(): void
    {
        // jsonb round-trips can hand back strings; the factory casts before building the rule.
        $terms = $this->factory->forCompany($this->company([
            'tax_brackets' => [
                ['threshold' => '500', 'rate' => '0.035'],
                ['threshold' => null, 'rate' => '0.07'],
            ],
        ]));

        $line = $this->calculator->payroll(new TimesheetEntry('X', 40.0, 15.0, 20.0), $terms);

        $this->assertEqualsWithDelta(42.0, $line->taxWithheld, self::TOLERANCE, '7% of 600');
    }

    public function test_empty_and_null_brackets_both_mean_no_withholding(): void
    {
        foreach ([[], null] as $brackets) {
            $terms = $this->factory->forCompany($this->company(['tax_brackets' => $brackets]));
            $line = $this->calculator->payroll(new TimesheetEntry('X', 40.0, 12.0, 14.14), $terms);

            $this->assertEqualsWithDelta(0.0, $line->taxWithheld, self::TOLERANCE);
            $this->assertEqualsWithDelta(480.0, $line->net, self::TOLERANCE);
        }
    }

    public function test_malformed_brackets_are_skipped_rather_than_crashing(): void
    {
        $terms = $this->factory->forCompany($this->company([
            'tax_brackets' => ['garbage', ['threshold' => 100], ['rate' => 0.05]],
        ]));

        $line = $this->calculator->payroll(new TimesheetEntry('X', 40.0, 15.0, 20.0), $terms);

        // Only the last entry carries a rate; the two malformed ones are dropped.
        $this->assertEqualsWithDelta(30.0, $line->taxWithheld, self::TOLERANCE, '5% of 600');
    }

    public function test_tax_destination_round_trips(): void
    {
        $retained = $this->factory->forCompany($this->company(['tax_destination' => TaxRule::RETAINED]));
        $this->assertTrue($retained->taxRule->isRetainedByAgency());

        $remitted = $this->factory->forCompany($this->company(['tax_destination' => TaxRule::REMITTED]));
        $this->assertFalse($remitted->taxRule->isRetainedByAgency());

        // A junk value must not silently turn a liability into margin.
        $junk = $this->factory->forCompany($this->company(['tax_destination' => 'whatever']));
        $this->assertFalse($junk->taxRule->isRetainedByAgency());
    }

    public function test_unknown_payout_rounding_falls_back_to_cents(): void
    {
        $terms = $this->factory->forCompany($this->company(['payout_rounding' => 'nonsense']));

        $this->assertSame(PayrollTerms::PAYOUT_CENT, $terms->payoutRounding);
    }

    /**
     * Overtime terms are no longer a company-level setting — they live per role on
     * staffing_company_rates (see StaffingPayrollCalculator's entry-level overrides). The
     * factory always hands back the federal-default baseline regardless of what's on the
     * company row; a role without its own override falls back to this, never to per-company
     * configuration.
     */
    public function test_overtime_terms_are_always_the_federal_default_baseline(): void
    {
        $terms = $this->factory->forCompany($this->company());

        $this->assertEqualsWithDelta(40.0, $terms->overtimeThresholdHours, self::TOLERANCE);
        $this->assertEqualsWithDelta(1.5, $terms->overtimeMultiplier, self::TOLERANCE);
    }

    /** A per-role override (not a company setting) is how a different threshold is expressed now. */
    public function test_a_role_can_define_a_different_overtime_threshold_via_entry_override(): void
    {
        $terms = $this->factory->forCompany($this->company(['tax_brackets' => []]));

        $line = $this->calculator->payroll(
            new TimesheetEntry('X', 48.0, 10.0, 15.0, overtimeThresholdOverride: 45.0),
            $terms,
        );

        $this->assertEqualsWithDelta(45.0, $line->regularHours, self::TOLERANCE);
        $this->assertEqualsWithDelta(3.0, $line->overtimeHours, self::TOLERANCE);
    }

    /** New companies only ever set a flat tax_rate — no tiered brackets. */
    public function test_flat_tax_rate_is_used_when_there_are_no_brackets(): void
    {
        $terms = $this->factory->forCompany($this->company([
            'tax_brackets' => null,
            'tax_rate' => 0.04,
        ]));

        $line = $this->calculator->payroll(new TimesheetEntry('X', 40.0, 15.0, 20.0), $terms);

        $this->assertEqualsWithDelta(24.0, $line->taxWithheld, self::TOLERANCE, '4% of 600');
    }

    /** Existing tiered agreements (DYKE) still take priority over a flat tax_rate. */
    public function test_tiered_brackets_win_over_a_flat_tax_rate_when_both_are_set(): void
    {
        $terms = $this->factory->forCompany($this->company([
            'tax_rate' => 0.04,
        ]));

        $line = $this->calculator->payroll(new TimesheetEntry('X', 40.0, 15.0, 20.0), $terms);

        $this->assertEqualsWithDelta(42.0, $line->taxWithheld, self::TOLERANCE, '7% of 600, the DYKE bracket, not 4%');
    }
}
