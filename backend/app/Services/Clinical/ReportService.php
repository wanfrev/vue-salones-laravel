<?php

namespace App\Services\Clinical;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/** Datos de respaldo para los informes imprimibles (el documento mismo se arma en el navegador). */
class ReportService
{
    public const MAX_RANGE_DAYS = 366;
    public const MAX_ROWS = 200;

    /**
     * Sesiones a las que el paciente SÍ asistió (cita `completed`) entre dos fechas, de la más
     * antigua a la más reciente — es lo que respalda una constancia de asistencia.
     *
     * @return array<int, array{id: string, start_time: ?string, service_name: ?string}>
     */
    public function attendance(string $businessId, string $clientId, string $from, string $to): array
    {
        $start = CarbonImmutable::parse($from)->startOfDay();
        $end = CarbonImmutable::parse($to)->endOfDay();

        if ($start->gt($end)) {
            throw new InvalidArgumentException('La fecha inicial no puede ser posterior a la final.');
        }
        if ((int) $start->startOfDay()->diffInDays($end->startOfDay()) > self::MAX_RANGE_DAYS) {
            throw new InvalidArgumentException('El rango máximo para una constancia es de un año.');
        }

        return DB::table('appointments as a')
            ->leftJoin('services as s', 's.id', '=', 'a.service_id')
            ->where('a.business_id', $businessId)
            // Sus citas propias, o las de un caso del que es (o fue) integrante: en terapia de pareja/familia
            // asisten todos, aunque la cita esté a nombre del titular.
            ->where(fn ($q) => $q->where('a.client_id', $clientId)->orWhereIn('a.id', function ($sub) use ($businessId, $clientId) {
                $sub->select('ca.appointment_id')
                    ->from('clinical_case_appointments as ca')
                    ->join('clinical_case_members as m', 'm.case_id', '=', 'ca.case_id')
                    ->where('ca.business_id', $businessId)
                    ->where('m.client_id', $clientId);
            }))
            ->where('a.status', 'completed')
            ->where('a.start_time', '>=', $start->toDateTimeString())
            ->where('a.start_time', '<=', $end->toDateTimeString())
            ->orderBy('a.start_time')
            ->limit(self::MAX_ROWS)
            ->get(['a.id', 'a.start_time', 's.name as service_name'])
            ->map(fn ($r) => [
                'id' => $r->id,
                // Misma forma ISO-8601 que el resto de la API de citas.
                'start_time' => $r->start_time ? CarbonImmutable::parse($r->start_time)->toIso8601String() : null,
                'service_name' => $r->service_name,
            ])
            ->all();
    }
}
