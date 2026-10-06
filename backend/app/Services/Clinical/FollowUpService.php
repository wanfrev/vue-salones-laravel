<?php

namespace App\Services\Clinical;

use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Listas de seguimiento clínico: qué requiere atención hoy. Todo se calcula con columnas en claro
 * (estado y fecha de la cita, nivel de riesgo, fecha de la nota) — nunca se descifra el contenido
 * de una nota. Cada lista va acotada (LIMIT) y en una sola consulta con JOIN/subconsulta.
 *
 * "Asistió" = cita con status `completed` (el cobro en el POS también la marca así).
 */
class FollowUpService
{
    public const LIMIT = 100;
    public const NOTES_LOOKBACK_DAYS = 30;
    public const DEFAULT_WEEKS = 4;

    /** Citas que ya no esperan al paciente: no cuentan como "tiene próxima sesión". */
    private const DEAD_STATUSES = ['cancelled', 'no_show'];

    /**
     * @param  ?string  $employeeId  si viene, "notas pendientes" se limita a las citas de ese profesional
     *                               (un empleado solo ve las suyas; el admin ve todas).
     * @return array{weeks: int, notes_pending: array, risk_unfollowed: array, risk_cases: array, inactive: array}
     */
    public function build(string $businessId, int $weeks, ?string $employeeId = null, ?CarbonImmutable $now = null): array
    {
        $now ??= CarbonImmutable::now();

        return [
            'weeks' => $weeks,
            'notes_pending' => $this->notesPending($businessId, $employeeId, $now),
            'risk_unfollowed' => $this->riskUnfollowed($businessId, $now),
            'risk_cases' => $this->riskCases($businessId, $now),
            'inactive' => $this->inactive($businessId, $weeks, $now),
        ];
    }

    /** Sesiones ya atendidas (últimos 30 días) a las que nadie les escribió nota. */
    public function notesPending(string $businessId, ?string $employeeId, CarbonImmutable $now): array
    {
        return DB::table('appointments as a')
            ->join('clients as c', 'c.id', '=', 'a.client_id')
            ->leftJoin('services as s', 's.id', '=', 'a.service_id')
            ->leftJoin('clinical_case_appointments as ca', 'ca.appointment_id', '=', 'a.id')
            ->leftJoin('clinical_cases as cc', 'cc.id', '=', 'ca.case_id')
            ->where('a.business_id', $businessId)
            ->where('a.status', 'completed')
            ->where('a.start_time', '>=', $now->subDays(self::NOTES_LOOKBACK_DAYS)->toDateTimeString())
            ->where('a.start_time', '<=', $now->toDateTimeString())
            ->when($employeeId, fn (Builder $q) => $q->where('a.employee_id', $employeeId))
            ->whereNotExists(fn (Builder $q) => $q->select(DB::raw(1))
                ->from('clinical_session_notes as n')
                ->whereColumn('n.appointment_id', 'a.id'))
            ->orderByDesc('a.start_time')
            ->limit(self::LIMIT)
            ->get(['a.id as appointment_id', 'a.client_id', 'c.full_name as client_name', 'a.start_time', 's.name as service_name', 'ca.case_id', 'cc.name as case_name'])
            ->map(fn ($r) => (array) $r)
            ->all();
    }

    /**
     * Pacientes cuya ÚLTIMA nota quedó con riesgo moderado/alto y que no tienen próxima sesión
     * agendada. Más grave primero, y a igual gravedad la que lleva más tiempo sin atención.
     */
    public function riskUnfollowed(string $businessId, CarbonImmutable $now): array
    {
        // Última nota de cada paciente (el número de sesión crece por paciente).
        $latest = DB::table('clinical_session_notes')
            ->select('client_id', DB::raw('MAX(session_number) as last_number'))
            ->where('business_id', $businessId)
            ->whereNull('case_id') // el riesgo individual sale solo de notas individuales
            ->groupBy('client_id');

        $rows = DB::table('clinical_session_notes as n')
            ->joinSub($latest, 'latest', fn ($j) => $j
                ->on('latest.client_id', '=', 'n.client_id')
                ->on('latest.last_number', '=', 'n.session_number'))
            ->join('clients as c', 'c.id', '=', 'n.client_id')
            ->where('n.business_id', $businessId)
            ->whereNull('n.case_id')
            ->whereIn('n.risk_level', ['moderate', 'high'])
            ->whereNotExists(fn (Builder $q) => $this->futureAppointment($q, $businessId, 'n.client_id', $now))
            ->get(['n.client_id', 'c.full_name as client_name', 'c.phone', 'n.risk_level', 'n.session_date', 'n.session_number']);

        return $rows
            ->map(function ($r) use ($now) {
                $date = CarbonImmutable::parse($r->session_date)->startOfDay();

                return [
                    'client_id' => $r->client_id,
                    'client_name' => $r->client_name,
                    'phone' => $r->phone,
                    'risk_level' => $r->risk_level,
                    'session_date' => $date->toDateString(),
                    'session_number' => (int) $r->session_number,
                    'days_since' => (int) $date->diffInDays($now->startOfDay()),
                ];
            })
            ->sort(fn ($a, $b) => [$b['risk_level'] === 'high', $b['days_since']] <=> [$a['risk_level'] === 'high', $a['days_since']])
            ->take(self::LIMIT)
            ->values()
            ->all();
    }

    /**
     * Casos ACTIVOS cuya última nota CONJUNTA quedó con riesgo moderado/alto y que no tienen próxima
     * sesión agendada. El riesgo de una sesión de pareja/familia (p. ej. violencia) no pertenece a un
     * integrante sino al caso, por eso se avisa aparte del riesgo individual.
     */
    public function riskCases(string $businessId, CarbonImmutable $now): array
    {
        $latest = DB::table('clinical_session_notes')
            ->select('case_id', DB::raw('MAX(session_number) as last_number'))
            ->where('business_id', $businessId)
            ->whereNotNull('case_id')
            ->groupBy('case_id');

        return DB::table('clinical_session_notes as n')
            ->joinSub($latest, 'latest', fn ($j) => $j
                ->on('latest.case_id', '=', 'n.case_id')
                ->on('latest.last_number', '=', 'n.session_number'))
            ->join('clinical_cases as c', 'c.id', '=', 'n.case_id')
            ->where('n.business_id', $businessId)
            ->where('c.status', 'active')
            ->whereIn('n.risk_level', ['moderate', 'high'])
            ->whereNotExists(fn (Builder $q) => $q->select(DB::raw(1))
                ->from('clinical_case_appointments as ca')
                ->join('appointments as f', 'f.id', '=', 'ca.appointment_id')
                ->whereColumn('ca.case_id', 'n.case_id')
                ->where('f.start_time', '>', $now->toDateTimeString())
                ->whereNotIn('f.status', self::DEAD_STATUSES))
            ->get(['n.case_id', 'c.name as case_name', 'c.type', 'n.risk_level', 'n.session_date', 'n.session_number'])
            ->map(function ($r) use ($now) {
                $date = CarbonImmutable::parse($r->session_date)->startOfDay();

                return [
                    'case_id' => $r->case_id,
                    'case_name' => $r->case_name,
                    'type' => $r->type,
                    'risk_level' => $r->risk_level,
                    'session_date' => $date->toDateString(),
                    'session_number' => (int) $r->session_number,
                    'days_since' => (int) $date->diffInDays($now->startOfDay()),
                ];
            })
            ->sort(fn ($a, $b) => [$b['risk_level'] === 'high', $b['days_since']] <=> [$a['risk_level'] === 'high', $a['days_since']])
            ->take(self::LIMIT)
            ->values()
            ->all();
    }

    /**
     * Pacientes que sí vinieron alguna vez, no tienen próxima sesión agendada y llevan más de
     * `$weeks` semanas sin asistir — posible abandono.
     */
    public function inactive(string $businessId, int $weeks, CarbonImmutable $now): array
    {
        $cutoff = $now->subWeeks($weeks);

        return DB::table('appointments as a')
            ->join('clients as c', 'c.id', '=', 'a.client_id')
            ->where('a.business_id', $businessId)
            ->where('a.status', 'completed')
            ->whereNotExists(fn (Builder $q) => $this->futureAppointment($q, $businessId, 'a.client_id', $now))
            ->groupBy('a.client_id', 'c.full_name', 'c.phone')
            ->havingRaw('MAX(a.start_time) < ?', [$cutoff->toDateTimeString()])
            ->orderBy(DB::raw('MAX(a.start_time)'))
            ->limit(self::LIMIT)
            ->get([
                'a.client_id', 'c.full_name as client_name', 'c.phone',
                DB::raw('MAX(a.start_time) as last_session'), DB::raw('COUNT(*) as sessions'),
            ])
            ->map(fn ($r) => [
                'client_id' => $r->client_id,
                'client_name' => $r->client_name,
                'phone' => $r->phone,
                'last_session' => CarbonImmutable::parse($r->last_session)->toDateString(),
                'days_since' => (int) CarbonImmutable::parse($r->last_session)->startOfDay()->diffInDays($now->startOfDay()),
                'sessions' => (int) $r->sessions,
            ])
            ->all();
    }

    /** Subconsulta correlacionada: ¿el paciente tiene una cita futura que sí lo espera? */
    private function futureAppointment(Builder $q, string $businessId, string $clientColumn, CarbonImmutable $now): void
    {
        $q->select(DB::raw(1))
            ->from('appointments as f')
            ->whereColumn('f.client_id', $clientColumn)
            ->where('f.business_id', $businessId)
            ->where('f.start_time', '>', $now->toDateTimeString())
            ->whereNotIn('f.status', self::DEAD_STATUSES);
    }
}
