<?php

namespace App\Services;

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

    /** Reglas para el bloque `cashea` de las peticiones del POS. */
    public static function rules(): array
    {
        return [
            'cashea' => 'nullable|array',
            'cashea.fee_percentage' => 'required_with:cashea|numeric|min:0|max:50',
            'cashea.down_payment_percentage' => 'required_with:cashea|numeric|min:0|max:100',
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

    /**
     * Desglose del pago: una sola línea `cashea` por el neto, con el bruto, el % y la inicial como datos
     * (Cashea paga todo de una vez: no hay pago mixto).
     */
    public static function breakdown(float $gross, array $cashea): array
    {
        $fee = (float) $cashea['fee_percentage'];
        $down = (float) $cashea['down_payment_percentage'];
        $t = self::totals($gross, $fee, $down);

        return [[
            'method' => 'cashea',
            'currency' => 'USD',
            'inputAmount' => $t['net'],
            'amount' => $t['net'],
            'cashea' => [
                'gross' => round($gross, 2),
                'fee_percentage' => $fee,
                'fee_amount' => $t['fee'],
                'down_payment_percentage' => $down,
                'down_payment_amount' => $t['down_payment'],
            ],
        ]];
    }

    /** Nota de la venta: «Cashea: $164.00 − 10% ($16.40) = $147.60 · inicial 40% ($65.60)». */
    public static function note(float $gross, array $cashea, ?string $notes = null): string
    {
        $fee = (float) $cashea['fee_percentage'];
        $down = (float) $cashea['down_payment_percentage'];
        $t = self::totals($gross, $fee, $down);
        $fmt = fn (float $n) => '$' . number_format($n, 2, '.', '');
        $pct = fn (float $n) => rtrim(rtrim(number_format($n, 2, '.', ''), '0'), '.') . '%';

        $text = "Cashea: {$fmt($gross)} − {$pct($fee)} ({$fmt($t['fee'])}) = {$fmt($t['net'])} · inicial {$pct($down)} ({$fmt($t['down_payment'])})";

        return trim($notes ?? '') !== '' ? "{$text}. " . trim($notes) : $text;
    }
}
