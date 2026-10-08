<?php

namespace Tests\Unit\Staffing;

use App\Services\Staffing\ApprovalStamp;
use PHPUnit\Framework\TestCase;

class ApprovalStampTest extends TestCase
{
    private const SECRET = 'test-secret';

    private function facts(array $override = []): array
    {
        return $override + [
            'timesheet_id' => 'ts-1', 'company_id' => 'co-1', 'project_id' => null,
            'week_start' => '2026-10-04', 'approved_by' => 'user-1', 'approved_at' => '2026-10-08T14:32:00',
        ];
    }

    private function lines(): array
    {
        return [
            ['employee_id' => 'e1', 'role' => 'Cook', 'shift' => null, 'total_hours' => 40, 'gross' => 800, 'payout' => 720],
            ['employee_id' => 'e2', 'role' => 'Cook', 'shift' => 'night', 'total_hours' => 45.5, 'gross' => 950, 'payout' => 855],
        ];
    }

    public function test_code_has_the_expected_shape(): void
    {
        $this->assertMatchesRegularExpression('/^NOM-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/', ApprovalStamp::code(self::SECRET, $this->facts(), $this->lines()));
    }

    public function test_same_data_always_gives_the_same_code_regardless_of_line_order(): void
    {
        $a = ApprovalStamp::code(self::SECRET, $this->facts(), $this->lines());
        $b = ApprovalStamp::code(self::SECRET, $this->facts(), array_reverse($this->lines()));

        $this->assertSame($a, $b);
    }

    public function test_changing_an_hour_a_payout_or_the_approver_changes_the_code(): void
    {
        $original = ApprovalStamp::code(self::SECRET, $this->facts(), $this->lines());

        $hours = $this->lines();
        $hours[0]['total_hours'] = 41;
        $payout = $this->lines();
        $payout[1]['payout'] = 855.01;

        $this->assertNotSame($original, ApprovalStamp::code(self::SECRET, $this->facts(), $hours));
        $this->assertNotSame($original, ApprovalStamp::code(self::SECRET, $this->facts(), $payout));
        $this->assertNotSame($original, ApprovalStamp::code(self::SECRET, $this->facts(['approved_by' => 'user-2']), $this->lines()));
        $this->assertNotSame($original, ApprovalStamp::code(self::SECRET, $this->facts(['approved_at' => '2026-10-08T14:33:00']), $this->lines()));
    }

    public function test_a_different_secret_cannot_reproduce_the_code(): void
    {
        $this->assertNotSame(
            ApprovalStamp::code(self::SECRET, $this->facts(), $this->lines()),
            ApprovalStamp::code('another-secret', $this->facts(), $this->lines()),
        );
    }

    public function test_numeric_strings_from_the_database_match_plain_numbers(): void
    {
        $fromDb = $this->lines();
        $fromDb[0]['total_hours'] = '40.00';
        $fromDb[0]['gross'] = '800.00';

        $this->assertSame(
            ApprovalStamp::code(self::SECRET, $this->facts(), $this->lines()),
            ApprovalStamp::code(self::SECRET, $this->facts(), $fromDb),
        );
    }

    public function test_normalize_accepts_lowercase_spaces_and_missing_dashes(): void
    {
        $this->assertSame('NOM-7F3K-92QA', ApprovalStamp::normalize('nom-7f3k-92qa'));
        $this->assertSame('NOM-7F3K-92QA', ApprovalStamp::normalize(' nom 7f3k 92qa '));
        $this->assertSame('NOM-7F3K-92QA', ApprovalStamp::normalize('7F3K92QA'));
    }
}
