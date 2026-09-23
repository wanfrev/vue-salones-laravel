<?php

namespace App\Services;

use App\Models\DailyReport;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;

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
            // A diferencia de todo lo de arriba (que viene de daily_reports, cargado a mano),
            // esto sale directo de las transacciones reales del Punto de Venta -- el banco
            // elegido al cobrar con pago movil/transferencia/punto de venta (ver Finanzas >
            // Bancos). No hace falta que nadie lo escriba, se suma solo. Viene agrupado por
            // campo del reporte (pago_movil_bs/transfer_bs/pos_bs) para poder mostrarse anidado
            // bajo cada método en vez de mezclados en una sola lista.
            'banks' => $this->getBankBreakdown($businessId, $start, $end, $branchId),
            // Cuánto cobró cada persona (por quién registró el pago en el POS, no por quién
            // atendió el servicio) -- para que cada quien pueda cuadrar su propia caja sin
            // depender de que alguien cruce la base de datos. El controlador (dashboardSummary)
            // quita esta llave de la respuesta si quien pregunta no es admin/superadmin.
            'by_cashier' => $this->getCashierBreakdown($businessId, $start, $end, $branchId),
        ];
    }

    /** Único método por el que un split de pago puede llevar banco (ver Finanzas > Bancos) --
     *  el mismo mapeo que usa DailyReportPosSummaryService para sus campos "*_bs". */
    private const BANK_METHOD_TO_FIELD = [
        'pago_movil' => 'pago_movil_bs',
        'transfer' => 'transfer_bs',
        'punto_venta' => 'pos_bs',
    ];

    /**
     * Cuánto entró a cada banco en el período, sumando payments_breakdown de las transacciones
     * reales (no daily_reports), agrupado por el campo del reporte al que pertenece cada método
     * (pago_movil/transfer/punto_venta) -- así se puede mostrar el banco anidado bajo "Pago
     * Móvil", "Transferencia" o "Punto de Venta" en vez de una sola lista mezclada. Solo las
     * líneas de pago que llevan bank_name cuentan -- eso ya garantiza que son en bolívares, así
     * que inputAmount ya está en Bs sin necesidad de convertir.
     *
     * @return array<string, array<int, array{name: string, amount_bs: float}>>
     */
    private function getBankBreakdown(string $businessId, string $start, string $end, ?string $branchId): array
    {
        // $start/$end llegan como fecha simple ("YYYY-MM-DD") -- a diferencia de daily_reports.date
        // (una columna DATE, sin ambiguedad), paid_at/created_at son timestamps completos, asi que
        // sin extender el limite superior a fin de dia se perderian las transacciones de la
        // ultima fecha del rango.
        $query = Transaction::where('business_id', $businessId)
            ->whereNotIn('method', ['credito', 'cortesia'])
            ->whereBetween(DB::raw('COALESCE(paid_at, created_at)'), [$start . ' 00:00:00', $end . ' 23:59:59']);

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        $totals = [];
        foreach ($query->get(['payments_breakdown']) as $tx) {
            $breakdown = is_array($tx->payments_breakdown) ? $tx->payments_breakdown : [];
            foreach ($breakdown as $split) {
                $bankName = $split['bank_name'] ?? null;
                if (!$bankName) continue;
                $field = self::BANK_METHOD_TO_FIELD[$split['method'] ?? ''] ?? null;
                if (!$field) continue;
                $totals[$field][$bankName] = ($totals[$field][$bankName] ?? 0) + (float) ($split['inputAmount'] ?? 0);
            }
        }

        $result = [];
        foreach ($totals as $field => $banks) {
            $rows = [];
            foreach ($banks as $name => $amount) {
                $rows[] = ['name' => $name, 'amount_bs' => round($amount, 2)];
            }
            usort($rows, fn ($a, $b) => $b['amount_bs'] <=> $a['amount_bs']);
            $result[$field] = $rows;
        }

        return $result;
    }

    /**
     * Cuánto cobró cada persona en el período, agrupado por quien registró el pago
     * (`created_by`) -- no por quién atendió el servicio (`employee_id`), que es otra cosa. Un
     * abono a crédito cuenta para quien lo cobró, no para quien emitió la venta original.
     *
     * @return array<int, array{
     *   user_id: string|null, name: string, usd_total: float, ves_total: float, credito_issued: float,
     *   usd_items: array<int, array{method: string, amount: float}>,
     *   ves_items: array<int, array{method: string, amount: float}>,
     * }>
     */
    private function getCashierBreakdown(string $businessId, string $start, string $end, ?string $branchId): array
    {
        $query = Transaction::where('business_id', $businessId)
            ->whereBetween(DB::raw('COALESCE(paid_at, created_at)'), [$start . ' 00:00:00', $end . ' 23:59:59']);

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        $usd = [];     // [userKey][method] => monto
        $ves = [];     // [userKey][method] => monto
        $credito = []; // [userKey] => monto
        $names = [];

        foreach ($query->with('createdBy:id,full_name')->get() as $tx) {
            $userKey = $tx->created_by ?: '__sin_registrar__';
            $names[$userKey] = $tx->createdBy?->full_name ?? 'Sin registrar';

            if ($tx->method === 'credito') {
                $credito[$userKey] = ($credito[$userKey] ?? 0) + (float) $tx->total_amount;
                continue;
            }
            // Cortesía no es dinero cobrado (el servicio se regaló) -- no cuenta para el cuadre
            // de caja de nadie, a diferencia del crédito que sí queda registrado como pendiente.
            if ($tx->method === 'cortesia') {
                continue;
            }

            $breakdown = is_array($tx->payments_breakdown) ? $tx->payments_breakdown : [];

            // Dato viejo o venta de un solo método sin desglose guardado: usa el método y el
            // monto de la transacción tal cual, convirtiendo a Bs con su propia tasa si aplica.
            if (empty($breakdown)) {
                $isVes = in_array($tx->method, ['cash_ves', 'transfer', 'pago_movil', 'punto_venta'], true);
                if ($isVes) {
                    $rate = (float) ($tx->exchange_rate_used ?: 0);
                    $ves[$userKey][$tx->method] = ($ves[$userKey][$tx->method] ?? 0) + (float) $tx->total_amount * $rate;
                } else {
                    $usd[$userKey][$tx->method] = ($usd[$userKey][$tx->method] ?? 0) + (float) $tx->total_amount;
                }
                continue;
            }

            foreach ($breakdown as $split) {
                $method = $split['method'] ?? $tx->method;
                if ($method === 'credito' || $method === 'cortesia') continue;
                $isVesSplit = strtoupper((string) ($split['currency'] ?? '')) === 'VES';
                if ($isVesSplit) {
                    $ves[$userKey][$method] = ($ves[$userKey][$method] ?? 0) + (float) ($split['inputAmount'] ?? 0);
                } else {
                    // Igual que en Finanzas > incomeBreakdown: ventas mixtas guardadas antes de
                    // corregir usePOSPayment.ts se quedaron con `amount` en 0 -- se cae a
                    // inputAmount para no perder esa plata real del cuadre de esta persona.
                    $amount = (float) ($split['amount'] ?? 0);
                    $input = (float) ($split['inputAmount'] ?? 0);
                    $usd[$userKey][$method] = ($usd[$userKey][$method] ?? 0) + ($amount > 0 ? $amount : $input);
                }
            }
        }

        $userKeys = array_unique([...array_keys($usd), ...array_keys($ves), ...array_keys($credito)]);
        $result = [];
        foreach ($userKeys as $userKey) {
            $usdItems = [];
            foreach ($usd[$userKey] ?? [] as $method => $amount) {
                if ($amount <= 0) continue;
                $usdItems[] = ['method' => $method, 'amount' => round($amount, 2)];
            }
            usort($usdItems, fn ($a, $b) => $b['amount'] <=> $a['amount']);

            $vesItems = [];
            foreach ($ves[$userKey] ?? [] as $method => $amount) {
                if ($amount <= 0) continue;
                $vesItems[] = ['method' => $method, 'amount' => round($amount, 2)];
            }
            usort($vesItems, fn ($a, $b) => $b['amount'] <=> $a['amount']);

            $result[] = [
                'user_id' => $userKey === '__sin_registrar__' ? null : $userKey,
                'name' => $names[$userKey] ?? 'Sin registrar',
                'usd_total' => round(array_sum(array_column($usdItems, 'amount')), 2),
                'ves_total' => round(array_sum(array_column($vesItems, 'amount')), 2),
                'credito_issued' => round($credito[$userKey] ?? 0, 2),
                'usd_items' => $usdItems,
                'ves_items' => $vesItems,
            ];
        }

        usort($result, fn ($a, $b) => $b['usd_total'] <=> $a['usd_total']);

        return $result;
    }
}
