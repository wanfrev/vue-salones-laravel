<?php

namespace App\Support;

/**
 * La parte de un cobro que no entró como dinero: lo que se dejó a crédito, lo que se regaló (cortesía) y lo que se
 * descontó (ver SaleDiscount). Se saca siempre del propio desglose del pago, así nunca queda desfasada si el cobro se
 * edita después.
 *
 * Importa porque `transactions.total_amount` es el valor de la venta (sobre él se calcula la comisión de quien
 * atendió), pero el INGRESO del negocio es solo lo cobrado: una venta de $53 donde la clienta paga $17 y el resto es
 * crédito y cortesía aporta $17 a Finanzas, aunque la comisión salga sobre los $53.
 *
 * Una venta 100 % a crédito o 100 % cortesía (método `credito` / `cortesia`) ya se excluye entera de los ingresos; esta
 * regla es para el resto de los cobros (el mixto, o un cobro normal con descuento).
 */
class UncollectedAmount
{
    /** Líneas de un desglose que no son dinero cobrado. */
    public const METHODS = ['credito', 'cortesia', 'descuento'];

    /**
     * @param  array<int, mixed>|null  $paymentsBreakdown
     */
    public static function of(?string $method, ?array $paymentsBreakdown): float
    {
        // La venta entera a crédito o cortesía ya se excluye completa de los ingresos: no se descuenta dos veces.
        if (in_array($method, ['credito', 'cortesia'], true) || empty($paymentsBreakdown)) {
            return 0.0;
        }

        $portion = 0.0;
        foreach ($paymentsBreakdown as $split) {
            if (is_array($split) && in_array($split['method'] ?? '', self::METHODS, true)) {
                $portion += (float) ($split['amount'] ?? $split['inputAmount'] ?? $split['input_amount'] ?? 0);
            }
        }

        return round($portion, 2);
    }

    /**
     * Lo mismo que `of()`, para sumarlo dentro de una consulta SQL (PostgreSQL, jsonb) sobre la tabla `transactions`.
     * Devuelve una expresión numérica; en una venta entera a crédito o cortesía, o con un desglose que no es una lista, vale 0.
     */
    public static function sql(string $table = 'transactions'): string
    {
        $list = "'".implode("','", self::METHODS)."'";

        return "(CASE WHEN {$table}.method NOT IN ('credito','cortesia') AND jsonb_typeof({$table}.payments_breakdown) = 'array' THEN "
            ."COALESCE((SELECT SUM(COALESCE(NULLIF(e.item->>'amount', ''), NULLIF(e.item->>'inputAmount', ''), NULLIF(e.item->>'input_amount', ''), '0')::numeric) "
            ."FROM jsonb_array_elements({$table}.payments_breakdown) AS e(item) WHERE e.item->>'method' IN ({$list})), 0) "
            .'ELSE 0 END)';
    }
}
