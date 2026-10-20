<?php

namespace App\Support;

use App\Models\Business;
use Carbon\Carbon;
use RuntimeException;

/**
 * "Registrar un pago con otra fecha" (POS y abonos de crédito): quién puede hacerlo y a qué
 * momento UTC corresponde la fecha elegida. Vive aparte para que ambos flujos apliquen
 * exactamente la misma regla.
 */
final class PaymentDate
{
    /**
     * Mensaje de rechazo, o null si se puede continuar (incluido el caso normal de no mandar
     * fecha). Se exige en el servidor -- no basta con ocultar el campo: el negocio tiene que
     * haber activado `pos_backdate_enabled` y quien registra debe ser admin o encargado.
     */
    public static function denial(?string $role, ?string $businessId, ?string $paidDate): ?string
    {
        if (!$paidDate) {
            return null;
        }

        if (!in_array($role, ['admin', 'superadmin', 'encargado'], true)) {
            return 'Solo un administrador o encargado puede cambiar la fecha de un pago.';
        }

        $business = $businessId ? Business::find($businessId) : null;
        $features = $business
            ? (is_array($business->features) ? $business->features : json_decode($business->features ?? '[]', true))
            : [];
        if (!($features['pos_backdate_enabled'] ?? false)) {
            return 'Registrar pagos con otra fecha no está activado en la configuración del negocio.';
        }

        return null;
    }

    /**
     * Fecha elegida ("YYYY-MM-DD", en la zona horaria del negocio) -> momento UTC con que se
     * guarda el pago. Null cuando no hay fecha o es hoy: ahí todo sigue como siempre (now()).
     * Conserva la hora actual del día para que el pago se vea natural en las listas; los
     * reportes agrupan por día, no por hora. `created_at` de la transacción NO se toca: sigue
     * marcando cuándo se registró de verdad.
     */
    public static function resolve(string $businessId, ?string $paidDate): ?Carbon
    {
        if (!$paidDate) {
            return null;
        }

        $tz = Business::find($businessId)?->timezone ?: 'UTC';
        $nowLocal = Carbon::now($tz);
        $date = Carbon::createFromFormat('Y-m-d', $paidDate, $tz)->startOfDay();

        if ($date->isSameDay($nowLocal)) {
            return null;
        }
        if ($date->gt($nowLocal)) {
            throw new RuntimeException('La fecha del pago no puede ser futura.');
        }

        return $date->setTimeFrom($nowLocal)->setTimezone(config('app.timezone'));
    }
}
