<?php

namespace App\Support;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Rango de fechas de los historiales (compras por producto, servicios por clienta…). Las fechas llegan como el
 * día LOCAL del negocio (YYYY-MM-DD) y se convierten a UTC para consultar. Siempre acotado: por defecto los
 * últimos 90 días y como máximo 12 meses, para que ningún historial recorra toda la tabla.
 */
class HistoryRange
{
    public const DEFAULT_DAYS = 90;
    public const MAX_DAYS = 366;

    /**
     * @throws \InvalidArgumentException si el rango es inválido o pasa de 12 meses
     * @return array{from: string, to: string, start: string, end: string}
     */
    public static function resolve(string $businessId, ?string $start, ?string $end): array
    {
        $tz = DB::table('businesses')->where('id', $businessId)->value('timezone') ?: 'UTC';

        $endDay = $end
            ? Carbon::createFromFormat('Y-m-d', $end, $tz)->startOfDay()
            : Carbon::now($tz)->startOfDay();
        $startDay = $start
            ? Carbon::createFromFormat('Y-m-d', $start, $tz)->startOfDay()
            : $endDay->copy()->subDays(self::DEFAULT_DAYS - 1);

        if ($endDay->lt($startDay)) {
            throw new \InvalidArgumentException('La fecha final no puede ser anterior a la inicial.');
        }
        if ($startDay->diffInDays($endDay) > self::MAX_DAYS) {
            throw new \InvalidArgumentException('El rango máximo es de 12 meses.');
        }

        return [
            'from' => $startDay->copy()->utc()->format('Y-m-d H:i:s'),
            'to' => $endDay->copy()->endOfDay()->utc()->format('Y-m-d H:i:s'),
            'start' => $startDay->format('Y-m-d'),
            'end' => $endDay->format('Y-m-d'),
        ];
    }
}
