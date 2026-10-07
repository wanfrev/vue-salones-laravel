<?php

namespace Tests\Unit\Clinical;

use App\Services\Clinical\AssessmentScoring;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class AssessmentScoringTest extends TestCase
{
    public function test_phq9_minimum_and_maximum(): void
    {
        $this->assertSame(
            ['total_score' => 0, 'severity' => 'minimal', 'risk_flag' => false],
            AssessmentScoring::score('phq9', array_fill(0, 9, 0)),
        );
        $this->assertSame(
            ['total_score' => 27, 'severity' => 'severe', 'risk_flag' => true],
            AssessmentScoring::score('phq9', array_fill(0, 9, 3)),
        );
    }

    #[DataProvider('phq9Bands')]
    public function test_phq9_severity_bands(int $total, string $severity): void
    {
        // Se reparte el total en los ítems 1-8 para no tocar el ítem de riesgo (índice 8).
        $answers = array_fill(0, 9, 0);
        $left = $total;
        for ($i = 0; $i < 8 && $left > 0; $i++) {
            $answers[$i] = min(3, $left);
            $left -= $answers[$i];
        }

        $scored = AssessmentScoring::score('phq9', $answers);

        $this->assertSame($total, $scored['total_score']);
        $this->assertSame($severity, $scored['severity']);
        $this->assertFalse($scored['risk_flag']);
    }

    public static function phq9Bands(): array
    {
        return [
            [4, 'minimal'], [5, 'mild'], [9, 'mild'], [10, 'moderate'], [14, 'moderate'],
            [15, 'moderately_severe'], [19, 'moderately_severe'], [20, 'severe'],
        ];
    }

    public function test_phq9_item_nine_raises_the_risk_flag_whatever_the_total(): void
    {
        $answers = array_fill(0, 9, 0);
        $answers[8] = 1;

        $scored = AssessmentScoring::score('phq9', $answers);

        $this->assertSame(1, $scored['total_score']);
        $this->assertSame('minimal', $scored['severity']);
        $this->assertTrue($scored['risk_flag']);
    }

    #[DataProvider('gad7Bands')]
    public function test_gad7_severity_bands_and_never_a_risk_flag(int $total, string $severity): void
    {
        $answers = array_fill(0, 7, 0);
        $left = $total;
        for ($i = 0; $i < 7 && $left > 0; $i++) {
            $answers[$i] = min(3, $left);
            $left -= $answers[$i];
        }

        $scored = AssessmentScoring::score('gad7', $answers);

        $this->assertSame($total, $scored['total_score']);
        $this->assertSame($severity, $scored['severity']);
        $this->assertFalse($scored['risk_flag']);
    }

    public static function gad7Bands(): array
    {
        return [[4, 'minimal'], [5, 'mild'], [9, 'mild'], [10, 'moderate'], [14, 'moderate'], [15, 'severe'], [21, 'severe']];
    }

    public function test_item_counts(): void
    {
        $this->assertSame(9, AssessmentScoring::itemCount('phq9'));
        $this->assertSame(7, AssessmentScoring::itemCount('gad7'));
        $this->assertSame(['phq9', 'gad7'], AssessmentScoring::instruments());
    }

    public function test_wrong_number_of_answers_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        AssessmentScoring::score('phq9', [1, 2, 3]);
    }

    public function test_out_of_range_answer_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        AssessmentScoring::score('gad7', [0, 0, 0, 0, 0, 0, 4]);
    }

    public function test_non_integer_answer_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        AssessmentScoring::score('gad7', [0, 0, 0, 0, 0, 0, '1']);
    }

    public function test_unknown_instrument_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        AssessmentScoring::score('beck', [1]);
    }
}
