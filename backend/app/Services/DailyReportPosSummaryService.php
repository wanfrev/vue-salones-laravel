<?php

namespace App\Services;

use App\Models\Business;
use App\Models\Transaction;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Agrupa lo cobrado en el punto de venta por método de pago, con el formato que
 * espera el reporte diario, para poder llenarlo sin transcribir a mano.
 */
class DailyReportPosSummaryService
{
    /**
     * Método de cobro del POS → columna del reporte diario, por moneda.
     * Lo que no esté acá cae en "Otro" de su moneda, para que ningún cobro
     * quede fuera del total.
     */
    private const METHOD_MAP = [
        'cash'        => ['USD' => 'cash_usd',      'VES' => 'cash_bs'],
        'cash_ves'    => ['USD' => 'cash_usd',      'VES' => 'cash_bs'],
        'zelle'       => ['USD' => 'zelle_usd',     'VES' => 'transfer_bs'],
        'binance'     => ['USD' => 'binance_usd',   'VES' => 'transfer_bs'],
        'cashea'      => ['USD' => 'cashea_usd',    'VES' => 'transfer_bs'],
        'card'        => ['USD' => 'card_usd',      'VES' => 'pos_bs'],
        'gift_card'   => ['USD' => 'gift_card_usd', 'VES' => 'gift_card_usd'],
        'pago_movil'  => ['USD' => 'other_usd',     'VES' => 'pago_movil_bs'],
        'transfer'    => ['USD' => 'other_usd',     'VES' => 'transfer_bs'],
        'punto_venta' => ['USD' => 'card_usd',      'VES' => 'pos_bs'],
    ];

    private const FIELDS = [
        'pos_bs', 'pago_movil_bs', 'cash_bs', 'transfer_bs', 'other_bs',
        'cash_usd', 'zelle_usd', 'binance_usd', 'cashea_usd',
        'card_usd', 'gift_card_usd', 'other_usd',
    ];

    /**
     * @return array{fields: array<string, float>, meta: array<string, mixed>}
     */
    public function summarize(string $businessId, string $date, ?string $branchId = null): array
    {
        $business = Business::find($businessId);
        $timezone = $business?->timezone ?: 'America/Caracas';

        $cleanDate = explode('T', $date)[0];
        $startOfDay = Carbon::parse($cleanDate, $timezone)->startOfDay()->setTimezone('UTC');
        $endOfDay = Carbon::parse($cleanDate, $timezone)->endOfDay()->setTimezone('UTC');

        $query = Transaction::where('business_id', $businessId)
            ->whereBetween(
                DB::raw('COALESCE(paid_at, created_at)'),
                [$startOfDay, $endOfDay]
            );

        // Sin sucursal seleccionada se toma todo el negocio; con sucursal se
        // incluyen también las transacciones sin sucursal asignada, igual que
        // hace el listado de reportes.
        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->where('branch_id', $branchId)->orWhereNull('branch_id');
            });
        }

        $transactions = $query->get();

        $fields = array_fill_keys(self::FIELDS, 0.0);
        $rates = [];
        $unmapped = [];

        foreach ($transactions as $tx) {
            $rate = (float) ($tx->exchange_rate_used ?: 0);
            if ($rate > 0) {
                $rates[] = $rate;
            }

            foreach ($this->splitsFor($tx, $rate) as $split) {
                $field = self::METHOD_MAP[$split['method']][$split['currency']] ?? null;

                if ($field === null) {
                    $unmapped[$split['method']] = true;
                    $field = $split['currency'] === 'VES' ? 'other_bs' : 'other_usd';
                }

                $fields[$field] += $split['amount'];
            }
        }

        foreach ($fields as $key => $value) {
            $fields[$key] = round($value, 2);
        }

        $businessRate = (float) ($business?->ves_exchange_rate ?: 0);
        $dominantRate = $this->dominantRate($rates);
        $finalRate = $dominantRate ?: ($businessRate > 0 ? $businessRate : null);

        return [
            'fields' => $fields,
            'meta' => [
                'transactions' => $transactions->count(),
                // Tasa más usada del día o tasa actual del negocio
                'exchange_rate' => $finalRate ? round((float) $finalRate, 2) : null,
                'unmapped_methods' => array_keys($unmapped),
            ],
        ];
    }

    /**
     * Devuelve los cobros de una transacción ya repartidos por método y moneda,
     * en la moneda en que se cobró.
     *
     * El desglose del POS unas veces incluye la propina y otras no, según el
     * camino por el que se registró la venta. Para que el reporte cuadre
     * siempre, se toma la distribución por método del desglose y se escala al
     * dinero que realmente entró (`total_amount + tip_amount`): si el desglose
     * ya traía la propina el factor es 1 y nada cambia, y si no la traía, la
     * reparte entre los métodos en la misma proporción en que se cobró.
     *
     * @return array<int, array{method: string, currency: string, amount: float}>
     */
    private function splitsFor(Transaction $tx, float $rate): array
    {
        $target = round((float) $tx->total_amount + (float) $tx->tip_amount, 2);

        if ($target <= 0) {
            return [];
        }

        $breakdown = is_array($tx->payments_breakdown) ? $tx->payments_breakdown : [];
        $parsed = [];
        $totalUsdEquiv = 0.0;

        foreach ($breakdown as $split) {
            if (!is_array($split)) {
                continue;
            }

            $currency = strtoupper((string) ($split['currency'] ?? '')) === 'VES' ? 'VES' : 'USD';
            $usdEquiv = $this->usdEquivalent($split, $currency, $rate);

            if ($usdEquiv <= 0) {
                continue;
            }

            $parsed[] = [
                'method' => (string) ($split['method'] ?? $tx->method),
                'currency' => $currency,
                'usdEquiv' => $usdEquiv,
            ];
            $totalUsdEquiv += $usdEquiv;
        }

        // Sin desglose utilizable (venta de un solo método, o datos viejos):
        // todo el cobro va al método de la transacción.
        if ($totalUsdEquiv <= 0) {
            $currency = $this->currencyForMethod((string) $tx->method);

            return [[
                'method' => (string) $tx->method,
                'currency' => $currency,
                'amount' => $currency === 'VES' ? round($target * $rate, 2) : $target,
            ]];
        }

        $scale = $target / $totalUsdEquiv;
        $result = [];

        foreach ($parsed as $split) {
            $scaledUsd = $split['usdEquiv'] * $scale;

            $result[] = [
                'method' => $split['method'],
                'currency' => $split['currency'],
                'amount' => $split['currency'] === 'VES'
                    ? round($scaledUsd * $rate, 2)
                    : round($scaledUsd, 2),
            ];
        }

        return $result;
    }

    /**
     * `amount` ya viene en USD equivalente; `inputAmount` viene en la moneda
     * cobrada. Se prefiere el primero y se cae al segundo por compatibilidad.
     */
    private function usdEquivalent(array $split, string $currency, float $rate): float
    {
        $amount = (float) ($split['amount'] ?? 0);
        if ($amount > 0) {
            return $amount;
        }

        $input = (float) ($split['inputAmount'] ?? $split['input_amount'] ?? 0);
        if ($input <= 0) {
            return 0.0;
        }

        return $currency === 'VES' && $rate > 0 ? $input / $rate : $input;
    }

    private function currencyForMethod(string $method): string
    {
        return in_array($method, ['cash_ves', 'pago_movil', 'transfer', 'punto_venta'], true)
            ? 'VES'
            : 'USD';
    }

    /**
     * @param  array<int, float>  $rates
     */
    private function dominantRate(array $rates): ?float
    {
        if (empty($rates)) {
            return null;
        }

        $counts = array_count_values(array_map(fn ($r) => (string) $r, $rates));
        arsort($counts);

        return (float) array_key_first($counts);
    }
}
