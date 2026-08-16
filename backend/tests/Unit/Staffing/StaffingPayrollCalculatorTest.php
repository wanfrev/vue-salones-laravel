<?php

namespace Tests\Unit\Staffing;

use App\Services\Staffing\PayrollTerms;
use App\Services\Staffing\StaffingPayrollCalculator;
use App\Services\Staffing\TaxRule;
use App\Services\Staffing\TimesheetEntry;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Every expected number below was read out of the live spreadsheets, not derived from this
 * engine. The odd-looking values (317.0250000000001) are the actual doubles Excel stored;
 * asserting them to the cent would hide a real drift, so the tolerance is 1e-9.
 *
 * Sources:
 *   NOMINA DYKE AGO 3.xlsx   sheet DYKE        week 2026-07-26 → 2026-08-01
 *   NOMINA PRUEBA.xlsx       sheet HILTON      week 2024-06-23 → 2024-06-29
 *   NOMINA PRUEBA.xlsx       sheet HILTON (2)  week 2025-12-28 → 2026-01-03
 *   INVOICE PRUEBA.xlsx      sheet CWT         invoice 11293
 */
class StaffingPayrollCalculatorTest extends TestCase
{
    private const TOLERANCE = 1e-9;

    private StaffingPayrollCalculator $calculator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->calculator = new StaffingPayrollCalculator();
    }

    /**
     * @return array<string, array{string, float, float, float, float, float, float, float, float, float}>
     *         name, hours, payRate, billRate, regAmount, otAmount, gross, tax, net, payout
     */
    public static function dykeRows(): array
    {
        return [
            'Adan Hernandez' => ['ADAN HERNANDEZ', 54.09, 15.0, 20.0, 600.0, 317.0250000000001, 917.0250000000001, 64.19175000000001, 852.8332500000001, 852.0],
            'Arael Walters' => ['ARAEL WALTERS', 32.11, 13.0, 18.0, 417.43, 0.0, 417.43, 14.610050000000001, 402.81995, 402.0],
            'Isai Alarcon' => ['ISAI ALARCON', 48.36, 13.0, 18.0, 520.0, 163.01999999999998, 683.02, 47.811400000000006, 635.2085999999999, 635.0],
            'Marla Gonzalez' => ['MARLA GONZALEZ', 39.59, 13.0, 18.0, 514.6700000000001, 0.0, 514.6700000000001, 36.02690000000001, 478.64310000000006, 478.0],
            'Jose Chavez' => ['JOSE CHAVEZ', 44.45, 13.0, 18.0, 520.0, 86.77500000000006, 606.7750000000001, 42.47425000000001, 564.3007500000001, 564.0],
            'Pepe Escalente' => ['PEPE ESCALENTE', 54.23, 13.0, 18.0, 520.0, 277.48499999999996, 797.4849999999999, 55.823949999999996, 741.6610499999999, 741.0],
        ];
    }

    #[DataProvider('dykeRows')]
    public function test_dyke_payroll_row_matches_the_spreadsheet(
        string $name,
        float $hours,
        float $payRate,
        float $billRate,
        float $regAmount,
        float $otAmount,
        float $gross,
        float $tax,
        float $net,
        float $payout,
    ): void {
        $line = $this->calculator->payroll(
            new TimesheetEntry($name, $hours, $payRate, $billRate, paymentMethod: 'DD'),
            PayrollTerms::dyke(),
        );

        $this->assertEqualsWithDelta($regAmount, $line->regularAmount, self::TOLERANCE, 'regular amount');
        $this->assertEqualsWithDelta($otAmount, $line->overtimeAmount, self::TOLERANCE, 'overtime amount');
        $this->assertEqualsWithDelta($gross, $line->gross, self::TOLERANCE, 'gross');
        $this->assertEqualsWithDelta($tax, $line->taxWithheld, self::TOLERANCE, 'tax withheld');
        $this->assertEqualsWithDelta($net, $line->net, self::TOLERANCE, 'net');
        $this->assertEqualsWithDelta($payout, $line->payout, self::TOLERANCE, 'payout');
    }

    public function test_dyke_run_totals_match_the_spreadsheet(): void
    {
        $run = $this->calculator->run($this->dykeEntries(), PayrollTerms::dyke());

        $this->assertEqualsWithDelta(272.83000000000004, $run->totalHours(), self::TOLERANCE, 'D23');
        $this->assertEqualsWithDelta(41.13, $run->totalOvertimeHours(), 1e-9, 'I23');
        $this->assertEqualsWithDelta(3936.4050000000007, $run->totalGross(), self::TOLERANCE, 'M23');
        $this->assertEqualsWithDelta(260.9383, $run->totalTaxWithheld(), self::TOLERANCE, 'N23');
        $this->assertEqualsWithDelta(3675.4667, $run->totalNet(), self::TOLERANCE, 'O23');
        $this->assertEqualsWithDelta(3672.0, $run->totalPayout(), self::TOLERANCE, 'Q23');
    }

    /** The cents the whole-dollar payout holds back — column R, still owed to the employees. */
    public function test_whole_dollar_payout_carries_the_remainder(): void
    {
        $run = $this->calculator->run($this->dykeEntries(), PayrollTerms::dyke());

        $this->assertEqualsWithDelta(3.4667, $run->totalCarried(), self::TOLERANCE);
        $this->assertEqualsWithDelta($run->totalNet(), $run->totalPayout() + $run->totalCarried(), self::TOLERANCE);
    }

    public function test_hilton_applies_the_rapid_fee_after_withholding(): void
    {
        // The HILTON sheet left the `%` column empty, so nothing is withheld; RAPID is a flat $2.
        $terms = PayrollTerms::withoutWithholding();

        $miriam = $this->calculator->payroll(
            new TimesheetEntry('MIRIAM MENDOZA', 30.5, 12.0, 14.14, fixedFees: 2.0),
            $terms,
        );
        $this->assertEqualsWithDelta(366.0, $miriam->gross, self::TOLERANCE, 'N18');
        $this->assertEqualsWithDelta(364.0, $miriam->net, self::TOLERANCE, 'Q18');

        $whitney = $this->calculator->payroll(
            new TimesheetEntry('WHITNEY ARIAS', 30.58, 12.0, 14.14, fixedFees: 2.0),
            $terms,
        );
        $this->assertEqualsWithDelta(366.96, $whitney->gross, self::TOLERANCE, 'N19');
        $this->assertEqualsWithDelta(364.96, $whitney->net, self::TOLERANCE, 'Q19');
    }

    public function test_hilton_run_total_matches_the_spreadsheet(): void
    {
        $entries = [
            new TimesheetEntry('ELMIS JULIO', 31.25, 12.0, 14.14, paymentMethod: 'DD'),
            new TimesheetEntry('FRANIA CARRERO', 0.0, 12.0, 14.14, paymentMethod: '4852143785'),
            new TimesheetEntry('SHIRLEY GUAIQUIRIAM', 29.33, 12.0, 14.14),
            new TimesheetEntry('MIRIAM MENDOZA', 30.5, 12.0, 14.14, fixedFees: 2.0, paymentMethod: '4852143777'),
            new TimesheetEntry('WHITNEY ARIAS', 30.58, 12.0, 14.14, fixedFees: 2.0, paymentMethod: '4663860288'),
            new TimesheetEntry('JASMIN DEL CASTILLO', 0.0, 12.0, 14.14, paymentMethod: '4485878104'),
        ];

        $run = $this->calculator->run($entries, PayrollTerms::withoutWithholding());

        $this->assertEqualsWithDelta(121.66, $run->totalHours(), self::TOLERANCE, 'D21');
        $this->assertEqualsWithDelta(1459.92, $run->totalGross(), self::TOLERANCE, 'N21');
        $this->assertEqualsWithDelta(1455.92, $run->totalNet(), self::TOLERANCE, 'Q21');
    }

    /** `TRANSPORTE` comes off before the withholding base, so it shrinks the tax too. */
    public function test_pre_tax_deduction_lowers_the_withholding_base(): void
    {
        $line = $this->calculator->payroll(
            new TimesheetEntry('X', 40.0, 15.0, 20.0, preTaxDeduction: 100.0),
            PayrollTerms::dyke(),
        );

        $this->assertEqualsWithDelta(500.0, $line->gross, self::TOLERANCE, '600 - 100 transporte');
        $this->assertEqualsWithDelta(35.0, $line->taxWithheld, self::TOLERANCE, '7% of 500, not of 600');
    }

    public function test_cwt_invoice_matches_the_spreadsheet(): void
    {
        $terms = PayrollTerms::withoutWithholding();

        // Bill rates differ per employee on the same invoice: $21 and $23.
        $one = $this->calculator->invoice(new TimesheetEntry('EMPLEADO 1', 40.0, 16.0, 21.0), $terms);
        $this->assertEqualsWithDelta(840.0, $one->regularAmount, self::TOLERANCE);
        $this->assertEqualsWithDelta(0.0, $one->overtimeHours, self::TOLERANCE);
        $this->assertEqualsWithDelta(840.0, $one->total, self::TOLERANCE);

        $two = $this->calculator->invoice(new TimesheetEntry('EMPLEADO 2', 45.0, 16.0, 23.0), $terms);
        $this->assertEqualsWithDelta(920.0, $two->regularAmount, self::TOLERANCE);
        $this->assertEqualsWithDelta(5.0, $two->overtimeHours, self::TOLERANCE);
        $this->assertEqualsWithDelta(34.5, $two->overtimeBillRate, self::TOLERANCE, '23 * 1.5');
        $this->assertEqualsWithDelta(172.5, $two->overtimeAmount, self::TOLERANCE);
        $this->assertEqualsWithDelta(1092.5, $two->total, self::TOLERANCE);

        $three = $this->calculator->invoice(new TimesheetEntry('EMPLEADO 3', 35.0, 16.0, 21.0), $terms);
        $this->assertEqualsWithDelta(735.0, $three->total, self::TOLERANCE);

        $this->assertEqualsWithDelta(2667.5, $one->total + $two->total + $three->total, self::TOLERANCE, 'TOTAL AMOUNT DUE');
    }

    /**
     * The HILTON (2) sheet computes TOTAL INVOICE as `regular_hours * company_rate` and never
     * bills the overtime, so its margin of $167 is understated. Billing OT the way the CWT
     * invoice does turns the same week into $317 — the engine must produce the larger figure.
     */
    public function test_billing_overtime_recovers_the_margin_the_sheet_loses(): void
    {
        $entries = [
            new TimesheetEntry('EMPLEADO 1', 40.0, 16.0, 20.0, adjustment: -35.0),
            new TimesheetEntry('EMPLEADO 2', 45.0, 16.0, 20.0, adjustment: 58.0),
            new TimesheetEntry('EMPLEADO 3', 35.0, 16.0, 20.0, adjustment: 150.0),
        ];

        $run = $this->calculator->run($entries, PayrollTerms::withoutWithholding());

        // TOTAL PAY column L — matches the sheet exactly, adjustments included.
        $this->assertEqualsWithDelta(2133.0, $run->totalNet(), self::TOLERANCE, 'L23');
        $this->assertEqualsWithDelta(2450.0, $run->totalInvoiced(), self::TOLERANCE, 'M23 + the unbilled OT');
        $this->assertEqualsWithDelta(317.0, $run->totalMargin(), self::TOLERANCE, 'the sheet says 167');
    }

    /** A negative `AJUSTE` claws money back and must survive into the net. */
    public function test_negative_adjustment_reduces_the_net(): void
    {
        $line = $this->calculator->payroll(
            new TimesheetEntry('EMPLEADO 1', 40.0, 16.0, 20.0, adjustment: -35.0),
            PayrollTerms::withoutWithholding(),
        );

        $this->assertEqualsWithDelta(640.0, $line->gross, self::TOLERANCE);
        $this->assertEqualsWithDelta(605.0, $line->net, self::TOLERANCE, 'L15');
    }

    public function test_withholding_destination_decides_who_keeps_the_percentage(): void
    {
        $entry = new TimesheetEntry('ADAN HERNANDEZ', 54.09, 15.0, 20.0);

        $remitted = $this->calculator->line($entry, PayrollTerms::dyke(TaxRule::REMITTED));
        $retained = $this->calculator->line($entry, PayrollTerms::dyke(TaxRule::RETAINED));

        // Same employee, same hours, same payout — the employee cannot tell the difference.
        $this->assertEqualsWithDelta($remitted->payroll->net, $retained->payroll->net, self::TOLERANCE);

        // But when the agency keeps the 7%, that is $64.19 of margin it was not counting.
        $this->assertEqualsWithDelta(917.0250000000001, $remitted->employerCost, self::TOLERANCE);
        $this->assertEqualsWithDelta(852.8332500000001, $retained->employerCost, self::TOLERANCE);
        $this->assertEqualsWithDelta(
            64.19175000000001,
            $retained->margin - $remitted->margin,
            self::TOLERANCE,
            'the withheld percentage, exactly',
        );
    }

    /**
     * The bracket is a cliff, not a slope: the rate applies to the whole base. Two dollars of
     * extra gross costs this employee $15.60 of net. Reproduced from the sheet on purpose —
     * if the business ever wants a marginal rate, this test is what should change first.
     */
    public function test_the_withholding_bracket_is_a_cliff(): void
    {
        $terms = PayrollTerms::dyke();

        $under = $this->calculator->payroll(new TimesheetEntry('UNDER', 4.9999, 100.0, 120.0), $terms);
        $over = $this->calculator->payroll(new TimesheetEntry('OVER', 5.0001, 100.0, 120.0), $terms);

        $this->assertEqualsWithDelta(499.99, $under->gross, 1e-9);
        $this->assertEqualsWithDelta(500.01, $over->gross, 1e-9);

        $this->assertEqualsWithDelta(0.035 * 499.99, $under->taxWithheld, 1e-9, '3.5% below 500');
        $this->assertEqualsWithDelta(0.07 * 500.01, $over->taxWithheld, 1e-9, '7% from 500 up');

        $this->assertGreaterThan(
            $over->net,
            $under->net,
            'earning more must not leave the employee with less — it does, and that is the sheet',
        );
    }

    /** Exactly at the threshold there is no overtime: `IF(hours < 40, hours, 40)`. */
    public function test_forty_hours_is_all_regular(): void
    {
        $line = $this->calculator->payroll(
            new TimesheetEntry('X', 40.0, 13.0, 18.0),
            PayrollTerms::dyke(),
        );

        $this->assertEqualsWithDelta(40.0, $line->regularHours, self::TOLERANCE);
        $this->assertEqualsWithDelta(0.0, $line->overtimeHours, self::TOLERANCE);
        $this->assertEqualsWithDelta(0.0, $line->overtimeAmount, self::TOLERANCE);
    }

    /** An employee on the sheet with no hours logged must not produce phantom money. */
    public function test_zero_hours_produces_nothing(): void
    {
        $line = $this->calculator->line(
            new TimesheetEntry('FRANIA CARRERO', 0.0, 12.0, 14.14),
            PayrollTerms::dyke(),
        );

        $this->assertEqualsWithDelta(0.0, $line->payroll->net, self::TOLERANCE);
        $this->assertEqualsWithDelta(0.0, $line->invoice->total, self::TOLERANCE);
        $this->assertEqualsWithDelta(0.0, $line->margin, self::TOLERANCE);
        $this->assertSame(0.0, $line->marginPercent(), 'no division by zero on an empty week');
    }

    /** A negative net must not be floored — that would deepen the debt behind the employee's back. */
    public function test_negative_net_is_not_floored(): void
    {
        $line = $this->calculator->payroll(
            new TimesheetEntry('X', 0.0, 13.0, 18.0, adjustment: -1.20),
            PayrollTerms::dyke(),
        );

        $this->assertEqualsWithDelta(-1.20, $line->payout, self::TOLERANCE, 'not -2.00');
    }

    public function test_negative_hours_are_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);

        new TimesheetEntry('X', -1.0, 13.0, 18.0);
    }

    /**
     * Regression: a role's OT bill rate must never be derived from the OT pay rate's ratio to
     * the regular pay rate. A real agreement's OT margin is not always proportional to its
     * regular margin — deriving one side from the other silently over/under-bills the client.
     */
    public function test_overtime_pay_and_bill_rate_overrides_are_independent(): void
    {
        $terms = PayrollTerms::withoutWithholding();

        // Regular: pay $15/bill $20 (margin $5). OT: pay $22.50/bill $27 — a margin the client
        // actually agreed to, NOT the $30 you'd get by scaling $20 by the pay side's 1.5x ratio.
        $entry = new TimesheetEntry(
            'X', 45.0, 15.0, 20.0,
            overtimePayRateOverride: 22.50,
            overtimeBillRateOverride: 27.00,
        );

        $payroll = $this->calculator->payroll($entry, $terms);
        $invoice = $this->calculator->invoice($entry, $terms);

        $this->assertEqualsWithDelta(22.50, $payroll->overtimeRate, self::TOLERANCE);
        $this->assertEqualsWithDelta(27.00, $invoice->overtimeBillRate, self::TOLERANCE, 'not $30 — that would be billRate * (22.50/15)');
        $this->assertEqualsWithDelta(27.00, $invoice->overtimeAmount, self::TOLERANCE, '1 OT hour at the agreed $27');
    }

    /** With no explicit OT rate override, the multiplier still drives both sides — unchanged behaviour. */
    public function test_overtime_falls_back_to_the_multiplier_when_no_explicit_rate_is_set(): void
    {
        $terms = PayrollTerms::withoutWithholding();
        $entry = new TimesheetEntry('X', 45.0, 15.0, 20.0, overtimeMultiplierOverride: 1.5);

        $payroll = $this->calculator->payroll($entry, $terms);
        $invoice = $this->calculator->invoice($entry, $terms);

        $this->assertEqualsWithDelta(22.50, $payroll->overtimeRate, self::TOLERANCE);
        $this->assertEqualsWithDelta(30.00, $invoice->overtimeBillRate, self::TOLERANCE);
    }

    /** @return list<TimesheetEntry> */
    private function dykeEntries(): array
    {
        return array_map(
            fn (array $row) => new TimesheetEntry($row[0], $row[1], $row[2], $row[3], paymentMethod: 'DD'),
            array_values(self::dykeRows()),
        );
    }
}
