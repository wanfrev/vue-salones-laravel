<?php

namespace App\Services;

use App\Models\DailyReport;

/**
 * Agrega los reportes diarios ya guardados en un rango de fechas, para el
 * dashboard financiero del módulo de Reportes: cuánto entró, en qué moneda,
 * por qué método, y cuánto se dio en crédito.
 *
 * A diferencia de DailyReportPosSummaryService (que lee `transactions` para
 * sugerir con qué llenar un reporte del día), este lee la tabla
 * `daily_reports` — lo que el negocio ya cerró y guardó — sea que lo haya
 * cargado a mano o traído del POS.
 */
class DailyReportSummaryService
{
    private const BS_FIELDS = ['pos_bs', 'pago_movil_bs', 'cash_bs', 'transfer_bs', 'other_bs'];
    private const USD_FIELDS = ['cash_usd', 'zelle_usd', 'binance_usd', 'cashea_usd', 'card_usd', 'gift_card_usd', 'other_usd'];

    /**
     * @return array{fields: array<string, float>, totals: array<string, float>, meta: array<string, mixed>}
     */
    public function summarize(string $businessId, string $start, string $end, ?string $branchId = null): array
    {
        $query = DailyReport::where('business_id', $businessId)
            ->whereBetween('date', [$start, $end]);

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->where('branch_id', $branchId)->orWhereNull('branch_id');
            });
        }

        $reports = $query->get();

        $fields = array_fill_keys([...self::BS_FIELDS, ...self::USD_FIELDS], 0.0);
        $totalBs = 0.0;
        $totalUsd = 0.0;
        $creditBs = 0.0;
        $creditUsd = 0.0;
        // Igual que cada fila de la tabla: el "gran total" en una moneda suma
        // lo cobrado en esa moneda más el equivalente de la otra, convertido
        // con la tasa PROPIA de cada día. Promediar una sola tasa para todo el
        // rango metería error si la tasa se movió durante el período.
        $grandTotalBs = 0.0;
        $grandTotalUsd = 0.0;
        $rates = [];

        foreach ($reports as $report) {
            foreach ([...self::BS_FIELDS, ...self::USD_FIELDS] as $field) {
                $fields[$field] += (float) $report->{$field};
            }

            $rowBs = (float) $report->total_bs;
            $rowUsd = (float) $report->total_usd;
            $rate = (float) $report->exchange_rate;

            $totalBs += $rowBs;
            $totalUsd += $rowUsd;
            $creditBs += (float) $report->credit_bs;
            $creditUsd += (float) $report->credit_usd;

            $bsInUsd = $rate > 0 ? $rowBs / $rate : 0.0;
            $usdInBs = $rowUsd * $rate;

            $grandTotalUsd += $rowUsd + $bsInUsd;
            $grandTotalBs += $rowBs + $usdInBs;

            if ($rate > 0) {
                $rates[] = $rate;
            }
        }

        foreach ($fields as $key => $value) {
            $fields[$key] = round($value, 2);
        }

        return [
            'fields' => $fields,
            'totals' => [
                'total_bs' => round($totalBs, 2),
                'total_usd' => round($totalUsd, 2),
                'grand_total_bs' => round($grandTotalBs, 2),
                'grand_total_usd' => round($grandTotalUsd, 2),
                'credit_bs' => round($creditBs, 2),
                'credit_usd' => round($creditUsd, 2),
            ],
            'meta' => [
                'reports_count' => $reports->count(),
                // Informativa: promedio simple de las tasas usadas en el rango.
                // El "gran total" de arriba NO usa esto — cada día se convierte
                // con su propia tasa para no introducir error.
                'avg_exchange_rate' => count($rates) > 0 ? round(array_sum($rates) / count($rates), 4) : null,
            ],
        ];
    }
}
