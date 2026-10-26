<?php

namespace App\Services;

use Illuminate\Validation\Rule;

/**
 * Cobros con Cashea (todos los nichos). Así lo explicó el negocio:
 *  - el monto de la venta por Cashea depende de la tasa del día (ej. $164), y la cajera lo escribe;
 *  - Cashea siempre se queda con un % de ese monto (hoy 10%, puede cambiar);
 *  - el cliente paga el 40% de inicial y el resto se lo paga a Cashea: eso ya NO lo registra el negocio;
 *  - el % de cada especialista se aplica al monto después del % de Cashea ($147,60).
 *
 * Por eso una venta con Cashea entra a Finanzas ese mismo día por el NETO (monto − % de Cashea), con
 * método `cashea`. Como el neto es lo que se guarda como monto cobrado, la comisión del especialista
 * sale sobre él sin ningún cálculo aparte. El bruto, el % de Cashea y la inicial quedan anotados en el
 * desglose del pago y en la nota de la venta, como referencia.
 *
 * Solo se activa si el POS manda el bloque `cashea`; un `method = cashea` sin él se guarda como siempre.
 */
class CasheaService
{
    public const DEFAULT_FEE_PERCENTAGE = 10;
    public const DEFAULT_DOWN_PAYMENT_PERCENTAGE = 40;

    /** Con qué método pagó el cliente la inicial. Solo se anota: no cambia lo que entra a Finanzas. */
    public const DOWN_PAYMENT_METHODS = [
        'cash' => 'Efectivo ($)',
        'cash_ves' => 'Efectivo (Bs)',
        'card' => 'Tarjeta',
        'transfer' => 'Transferencia',
        'zelle' => 'Zelle',
        'binance' => 'Binance',
        'pago_movil' => 'Pago Móvil',
        'punto_venta' => 'Punto de Vta (Bs)',
        'other' => 'Otro',
    ];

    /** Reglas para el bloque `cashea` de las peticiones del POS. */
    public static function rules(): array
    {
        return [
            'cashea' => 'nullable|array',
            'cashea.fee_percentage' => 'required_with:cashea|numeric|min:0|max:50',
            'cashea.down_payment_percentage' => 'required_with:cashea|numeric|min:0|max:100',
            'cashea.down_payment_method' => ['nullable', 'string', Rule::in(array_keys(self::DOWN_PAYMENT_METHODS))],
        ];
    }

    /** ¿Este cobro es una venta con Cashea? */
    public static function applies(string $method, ?array $cashea): bool
    {
        return $method === 'cashea' && is_array($cashea) && isset($cashea['fee_percentage']);
    }

    /**
     * Comisión de Cashea, inicial y neto, sobre el monto que pagó el cliente por Cashea.
     * (Con $164, 10% y 40%: comisión $16,40, inicial $65,60, neto $147,60.)
     *
     * @return array{fee: float, down_payment: float, net: float}
     */
    public static function totals(float $gross, float $feePercentage, float $downPaymentPercentage): array
    {
        $fee = round($gross * $feePercentage / 100, 2);

        return [
            'fee' => $fee,
            'down_payment' => round($gross * $downPaymentPercentage / 100, 2),
            'net' => round($gross - $fee, 2),
        ];
    }

    /** Neto de un monto (lo que le queda al negocio después del % de Cashea). */
    public static function net(float $amount, array $cashea): float
    {
        return round($amount * (1 - (float) $cashea['fee_percentage'] / 100), 2);
    }

    /** Métodos de la inicial que se cobran en bolívares (se anotan en Bs con la tasa del día). */
    private const VES_METHODS = ['cash_ves', 'transfer', 'pago_movil', 'punto_venta'];

    /**
     * Desglose del pago, que es de donde el cierre de caja y Finanzas reparten el dinero por método.
     *
     * Sin método de la inicial: una sola línea `cashea` por el neto (como siempre).
     * Con método: la inicial entra por el método con que se pagó y el resto por `cashea`; las dos líneas
     * suman el neto, así que el total de la venta no cambia. Los datos de la venta (bruto, %, inicial)
     * quedan anotados en la línea `cashea` (o en la única línea si Cashea ya no pone nada).
     */
    public static function breakdown(float $gross, array $cashea, float $rate = 1.0): array
    {
        $fee = (float) $cashea['fee_percentage'];
        $down = (float) $cashea['down_payment_percentage'];
        $t = self::totals($gross, $fee, $down);
        $downMethod = $cashea['down_payment_method'] ?? null;

        $info = [
            'gross' => round($gross, 2),
            'fee_percentage' => $fee,
            'fee_amount' => $t['fee'],
            'down_payment_percentage' => $down,
            'down_payment_amount' => $t['down_payment'],
            ...($downMethod ? ['down_payment_method' => $downMethod] : []),
        ];

        $line = fn (string $method, float $usd, string $currency = 'USD', ?float $input = null) => [
            'method' => $method,
            'currency' => $currency,
            'inputAmount' => $input ?? $usd,
            'amount' => $usd,
        ];

        $downIn = $downMethod ? min($t['down_payment'], $t['net']) : 0.0;
        if ($downIn <= 0) {
            return [$line('cashea', $t['net']) + ['cashea' => $info]];
        }

        $ves = in_array($downMethod, self::VES_METHODS, true);
        $downLine = $ves
            ? $line($downMethod, $downIn, 'VES', round($downIn * ($rate > 0 ? $rate : 1), 2))
            : $line($downMethod, $downIn);
        $rest = round($t['net'] - $downIn, 2);

        return $rest > 0
            ? [$downLine, $line('cashea', $rest) + ['cashea' => $info]]
            : [$downLine + ['cashea' => $info]];
    }

    /** Nota de la venta: «Cashea: $164.00 − 10% ($16.40) = $147.60 · inicial 40% ($65.60)». */
    public static function note(float $gross, array $cashea, ?string $notes = null): string
    {
        $fee = (float) $cashea['fee_percentage'];
        $down = (float) $cashea['down_payment_percentage'];
        $t = self::totals($gross, $fee, $down);
        $fmt = fn (float $n) => '$' . number_format($n, 2, '.', '');
        $pct = fn (float $n) => rtrim(rtrim(number_format($n, 2, '.', ''), '0'), '.') . '%';

        $downMethod = self::DOWN_PAYMENT_METHODS[$cashea['down_payment_method'] ?? ''] ?? null;
        $paidWith = $downMethod ? " pagada con {$downMethod}" : '';

        $text = "Cashea: {$fmt($gross)} − {$pct($fee)} ({$fmt($t['fee'])}) = {$fmt($t['net'])} · inicial {$pct($down)} ({$fmt($t['down_payment'])}){$paidWith}";

        return trim($notes ?? '') !== '' ? "{$text}. " . trim($notes) : $text;
    }
}
