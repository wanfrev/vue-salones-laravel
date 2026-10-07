<?php

namespace App\Services\Staffing;

use Carbon\CarbonImmutable;

/**
 * Pure aging math for the "cuentas por cobrar" report — no database, so it can be unit tested.
 * StaffingReceivablesService feeds it rows already aggregated by the database.
 *
 * Each invoice's outstanding amount is its total minus what was paid toward it specifically; money a
 * company paid "on account" (no invoice picked) and any overpayment on one invoice go into a
 * per-company credit that is applied to that company's OLDEST invoices first. That way the grand
 * total always equals invoiced − paid, exactly what StaffingInvoiceService::balanceForCompany shows.
 */
class ReceivablesAging
{
    public const BUCKETS = ['current', 'd1_30', 'd31_60', 'd61_90', 'd90_plus'];

    public static function bucketFor(int $daysOverdue): string
    {
        return match (true) {
            $daysOverdue <= 0 => 'current',
            $daysOverdue <= 30 => 'd1_30',
            $daysOverdue <= 60 => 'd31_60',
            $daysOverdue <= 90 => 'd61_90',
            default => 'd90_plus',
        };
    }

    /**
     * @param list<array{id: string, company_id: string, company_name: string, invoice_number: string, issue_date: string, due_date: string, total: float|int|string, applied: float|int|string}> $invoices
     * @param array<string, float|int|string> $onAccountByCompany company_id => payments with no invoice
     * @return array{as_of: string, totals: array<string, float>, companies: list<array<string, mixed>>}
     */
    public static function compute(array $invoices, array $onAccountByCompany, CarbonImmutable $asOf): array
    {
        $byCompany = [];
        foreach ($invoices as $invoice) {
            $byCompany[$invoice['company_id']][] = $invoice;
        }

        $companies = [];
        $grand = array_fill_keys([...self::BUCKETS, 'total'], 0.0);

        foreach ($byCompany as $companyId => $companyInvoices) {
            usort($companyInvoices, fn ($a, $b) => strcmp($a['due_date'], $b['due_date']) ?: strcmp($a['issue_date'], $b['issue_date']));

            $credit = (float) ($onAccountByCompany[$companyId] ?? 0);
            $rows = [];
            foreach ($companyInvoices as $invoice) {
                $total = (float) $invoice['total'];
                $applied = (float) $invoice['applied'];
                $credit += max(0.0, $applied - $total);
                $outstanding = max(0.0, $total - $applied);

                $absorbed = min($credit, $outstanding);
                $credit -= $absorbed;
                $outstanding = round($outstanding - $absorbed, 2);

                if ($outstanding <= 0) {
                    continue;
                }

                $due = CarbonImmutable::parse(substr($invoice['due_date'], 0, 10))->startOfDay();
                $daysOverdue = (int) $due->diffInDays($asOf->startOfDay(), false);

                $rows[] = [
                    'id' => $invoice['id'],
                    'invoice_number' => $invoice['invoice_number'],
                    'issue_date' => substr($invoice['issue_date'], 0, 10),
                    'due_date' => substr($invoice['due_date'], 0, 10),
                    'days_overdue' => max(0, $daysOverdue),
                    'total' => round($total, 2),
                    'outstanding' => $outstanding,
                    'bucket' => self::bucketFor($daysOverdue),
                ];
            }

            if ($rows === []) {
                continue;
            }

            $buckets = array_fill_keys([...self::BUCKETS, 'total'], 0.0);
            foreach ($rows as $row) {
                $buckets[$row['bucket']] += $row['outstanding'];
                $buckets['total'] += $row['outstanding'];
            }
            foreach ($buckets as $key => $value) {
                $buckets[$key] = round($value, 2);
                $grand[$key] += $value;
            }

            $companies[] = [
                'company_id' => $companyId,
                'company_name' => $companyInvoices[0]['company_name'],
                ...$buckets,
                'invoices' => $rows,
            ];
        }

        // Companies owing the most overdue money first — the ones to chase today.
        usort($companies, fn ($a, $b) => [$b['d90_plus'] + $b['d61_90'] + $b['d31_60'] + $b['d1_30'], $b['total']]
            <=> [$a['d90_plus'] + $a['d61_90'] + $a['d31_60'] + $a['d1_30'], $a['total']]);

        return [
            'as_of' => $asOf->toDateString(),
            'totals' => array_map(fn ($v) => round($v, 2), $grand),
            'companies' => $companies,
        ];
    }
}
