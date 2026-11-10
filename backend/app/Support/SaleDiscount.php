<?php

namespace App\Support;

use App\Models\Business;
use RuntimeException;

/**
 * Descuento por porcentaje al cobrar un servicio: baja lo que se cobra, NO la comisión. La comisión de quien atendió se
 * sigue calculando sobre el precio inicial; el descuento lo absorbe el negocio.
 *
 * Viaja dentro del desglose del cobro como una línea más con método `descuento` (monto en dólares y `percentage`), igual
 * que el crédito y la cortesía: así toda la lógica que ya reparte el desglose entre los cobros de un grupo o de varios
 * servicios lo reparte también, y no hace falta una columna nueva. Esa línea no es dinero cobrado: ver UncollectedAmount.
 */
final class SaleDiscount
{
    public const METHOD = 'descuento';

    /** Lo que el redondeo de repartir el descuento entre varios cobros puede desviarse del % exacto, en dólares. */
    private const TOLERANCE = 0.05;

    /**
     * La línea de descuento del desglose, o null si no hay.
     *
     * @param  array<int, mixed>|null  $paymentsBreakdown
     * @return array{amount: float, percentage: float}|null
     * @throws RuntimeException si hay más de una línea de descuento
     */
    public static function fromBreakdown(?array $paymentsBreakdown): ?array
    {
        $lines = array_values(array_filter(
            (array) $paymentsBreakdown,
            fn ($s) => is_array($s) && ($s['method'] ?? null) === self::METHOD,
        ));

        if ($lines === []) {
            return null;
        }
        if (count($lines) > 1) {
            throw new RuntimeException('Un cobro solo puede llevar un descuento.');
        }

        return [
            'amount' => round((float) ($lines[0]['amount'] ?? $lines[0]['inputAmount'] ?? 0), 2),
            'percentage' => round((float) ($lines[0]['percentage'] ?? 0), 2),
        ];
    }

    /** ¿El negocio tiene activados los descuentos (Configuración > Permisos)? */
    public static function enabled(string $businessId): bool
    {
        $features = Business::find($businessId)?->features;
        $features = is_array($features) ? $features : (json_decode($features ?? '[]', true) ?: []);

        return (bool) ($features['discount_enabled'] ?? false);
    }

    /**
     * Valida el descuento de un cobro de servicio. El porcentaje y el monto los manda la pantalla, así que aquí se exige
     * que el monto no pase del porcentaje del PRECIO INICIAL del servicio (con un margen por el redondeo al repartirlo).
     *
     * @param  array{amount: float, percentage: float}|null  $discount
     * @throws RuntimeException con un mensaje listo para mostrar
     */
    public static function assertAllowed(?array $discount, float $serviceAmount, string $businessId, bool $isCashea = false): void
    {
        if ($discount === null) {
            return;
        }
        if (!self::enabled($businessId)) {
            throw new RuntimeException('Los descuentos no están activados en este negocio.');
        }
        if ($isCashea) {
            throw new RuntimeException('Una venta con Cashea no admite descuento.');
        }
        if ($discount['percentage'] <= 0 || $discount['percentage'] > 100 || $discount['amount'] <= 0) {
            throw new RuntimeException('El descuento no es válido.');
        }

        $max = round($serviceAmount * $discount['percentage'] / 100, 2) + self::TOLERANCE;
        if ($discount['amount'] > $max || $discount['amount'] > $serviceAmount + 0.01) {
            throw new RuntimeException('El descuento no puede pasar del '.$discount['percentage'].'% del precio del servicio.');
        }
    }

    /** Lo que suman las líneas de descuento de un desglose (0 si no hay). */
    public static function portion(?array $paymentsBreakdown): float
    {
        $sum = 0.0;
        foreach ((array) $paymentsBreakdown as $split) {
            if (is_array($split) && ($split['method'] ?? null) === self::METHOD) {
                $sum += (float) ($split['amount'] ?? $split['inputAmount'] ?? 0);
            }
        }

        return round($sum, 2);
    }
}
