<?php

namespace Tests\Unit\Staffing;

use App\Services\Staffing\ReceivablesAging;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\TestCase;

class ReceivablesAgingTest extends TestCase
{
    private function invoice(string $id, string $company, string $due, float $total, float $applied = 0): array
    {
        return [
            'id' => $id, 'company_id' => $company, 'company_name' => strtoupper($company),
            'invoice_number' => $id, 'issue_date' => '2026-01-01', 'due_date' => $due,
            'total' => $total, 'applied' => $applied,
        ];
    }

    public function test_buckets_by_days_past_due(): void
    {
        $this->assertSame('current', ReceivablesAging::bucketFor(-5));
        $this->assertSame('current', ReceivablesAging::bucketFor(0));
        $this->assertSame('d1_30', ReceivablesAging::bucketFor(1));
        $this->assertSame('d1_30', ReceivablesAging::bucketFor(30));
        $this->assertSame('d31_60', ReceivablesAging::bucketFor(31));
        $this->assertSame('d61_90', ReceivablesAging::bucketFor(90));
        $this->assertSame('d90_plus', ReceivablesAging::bucketFor(91));
    }

    public function test_places_each_invoice_in_its_bucket_and_totals_them(): void
    {
        $asOf = CarbonImmutable::parse('2026-10-01');
        $report = ReceivablesAging::compute([
            $this->invoice('A', 'acme', '2026-10-10', 100),   // not due yet
            $this->invoice('B', 'acme', '2026-09-11', 200),   // 20 days late
            $this->invoice('C', 'acme', '2026-07-01', 300),   // 92 days late
        ], [], $asOf);

        $this->assertSame(100.0, $report['totals']['current']);
        $this->assertSame(200.0, $report['totals']['d1_30']);
        $this->assertSame(300.0, $report['totals']['d90_plus']);
        $this->assertSame(600.0, $report['totals']['total']);
        $this->assertSame(20, $report['companies'][0]['invoices'][1]['days_overdue']);
    }

    public function test_invoice_specific_payment_reduces_outstanding_and_fully_paid_is_dropped(): void
    {
        $report = ReceivablesAging::compute([
            $this->invoice('A', 'acme', '2026-09-01', 100, 40),
            $this->invoice('B', 'acme', '2026-09-01', 50, 50),
        ], [], CarbonImmutable::parse('2026-10-01'));

        $this->assertSame(60.0, $report['totals']['total']);
        $this->assertCount(1, $report['companies'][0]['invoices']);
    }

    public function test_on_account_payment_is_applied_to_the_oldest_invoice_first(): void
    {
        $report = ReceivablesAging::compute([
            $this->invoice('NEW', 'acme', '2026-09-20', 100),
            $this->invoice('OLD', 'acme', '2026-06-01', 100),
        ], ['acme' => 130], CarbonImmutable::parse('2026-10-01'));

        // 130 on account wipes OLD (100) and takes 30 off NEW → only 70 left, none in 90+.
        $this->assertSame(70.0, $report['totals']['total']);
        $this->assertSame(0.0, $report['totals']['d90_plus']);
        $this->assertSame(70.0, $report['totals']['d1_30']);
    }

    public function test_on_account_credit_never_crosses_companies(): void
    {
        $report = ReceivablesAging::compute([
            $this->invoice('A', 'acme', '2026-09-01', 100),
            $this->invoice('B', 'beta', '2026-09-01', 100),
        ], ['acme' => 100], CarbonImmutable::parse('2026-10-01'));

        $this->assertSame(100.0, $report['totals']['total']);
        $this->assertSame('BETA', $report['companies'][0]['company_name']);
    }

    public function test_overpaying_one_invoice_credits_the_companys_other_invoices(): void
    {
        $report = ReceivablesAging::compute([
            $this->invoice('A', 'acme', '2026-08-01', 100, 150),
            $this->invoice('B', 'acme', '2026-09-01', 100),
        ], [], CarbonImmutable::parse('2026-10-01'));

        $this->assertSame(50.0, $report['totals']['total']);
    }

    public function test_most_overdue_company_is_listed_first(): void
    {
        $report = ReceivablesAging::compute([
            $this->invoice('A', 'fresh', '2026-10-20', 9999),
            $this->invoice('B', 'late', '2026-05-01', 10),
        ], [], CarbonImmutable::parse('2026-10-01'));

        $this->assertSame('LATE', $report['companies'][0]['company_name']);
    }
}
