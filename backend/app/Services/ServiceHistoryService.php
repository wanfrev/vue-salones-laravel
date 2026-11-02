<?php

namespace App\Services;

use App\Support\HistoryRange;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Historial de servicios POR SERVICIO: a quién se le hizo keratina, balayage, manicure… y desde cuándo.
 *
 * Sale de las citas. Cuenta solo los servicios REALIZADOS: citas completadas o pagadas, nunca las canceladas ni
 * las no-show (una cita confirmada que todavía no ocurre o no se cobró no cuenta como hecha). La clienta es la de
 * la cita; una cita sin clienta (cobro directo de un servicio) se agrupa aparte («sin clienta registrada»).
 * Todo se calcula en la base de datos y el rango siempre está acotado (ver HistoryRange).
 *
 * Una visita con varios servicios son varias citas del mismo `group_id`: cada servicio cuenta para su propia
 * búsqueda, y una «visita» es una por `group_id` (o una por cita si no tiene).
 */
class ServiceHistoryService
{
    public const PAGE_SIZE = 25;
    private const MAX_SERVICES_LISTED = 30;

    /** Valor de `client_id` en el detalle para pedir los servicios sin clienta. */
    public const NO_CLIENT = 'none';

    /**
     * @throws \InvalidArgumentException si el rango es inválido o pasa de 12 meses
     * @return array{from: string, to: string, start: string, end: string}
     */
    public function resolveRange(string $businessId, ?string $start, ?string $end): array
    {
        return HistoryRange::resolve($businessId, $start, $end);
    }

    /**
     * Clientas a las que se les hizo el servicio buscado: una fila por clienta con cuántas veces, y la primera y
     * la última vez; más el resumen general y los servicios que coinciden con la búsqueda.
     *
     * @param  array{q?: ?string, service_id?: ?string, branch_id?: ?string, sort?: ?string, page?: int}  $filters
     * @param  array{from: string, to: string, start: string, end: string}  $range
     */
    public function byClient(string $businessId, array $filters, array $range): array
    {
        $page = max(1, (int) ($filters['page'] ?? 1));
        $sort = $filters['sort'] ?? 'recent';

        $rows = $this->base($businessId, $filters, $range)
            ->leftJoin('clients as c', 'c.id', '=', 'a.client_id')
            ->select('a.client_id')
            ->selectRaw('MAX(c.full_name) as client_name')
            ->selectRaw('MAX(c.phone) as client_phone')
            ->selectRaw($this->visitsSql().' as visits')
            ->selectRaw('MIN(a.start_time) as first_at')
            ->selectRaw('MAX(a.start_time) as last_at')
            ->groupBy('a.client_id')
            // La fila «sin clienta» siempre al final, ordenen como ordenen.
            ->orderByRaw('CASE WHEN a.client_id IS NULL THEN 1 ELSE 0 END')
            ->when($sort === 'times', fn (Builder $q) => $q->orderByRaw($this->visitsSql().' DESC'))
            ->when($sort === 'name', fn (Builder $q) => $q->orderByRaw('LOWER(MAX(c.full_name)) ASC'))
            ->orderByRaw('MAX(a.start_time) DESC')
            ->offset(($page - 1) * self::PAGE_SIZE)
            ->limit(self::PAGE_SIZE + 1) // «uno de más»: sabe si hay otra página sin hacer un COUNT
            ->get();

        return [
            'summary' => $this->summary($businessId, $filters, $range),
            // Las opciones salen de la búsqueda SIN acotar a un servicio: si no, al elegir uno quedaría solo ese y no
            // habría cómo volver a «Todos» ni pasar a otro.
            'services' => $this->services($businessId, Arr::except($filters, ['service_id']), $range),
            'clients' => $rows->take(self::PAGE_SIZE)->map(fn ($r) => [
                'client_id' => $r->client_id,
                'client_name' => $r->client_name,
                'client_phone' => $r->client_phone,
                'visits' => (int) $r->visits,
                'first_at' => $this->iso($r->first_at),
                'last_at' => $this->iso($r->last_at),
            ])->values()->all(),
            'page' => $page,
            'has_more' => $rows->count() > self::PAGE_SIZE,
            'range' => ['start' => $range['start'], 'end' => $range['end']],
        ];
    }

    /**
     * Los servicios de UNA clienta (o de las citas sin clienta, con NO_CLIENT) que coinciden con la búsqueda, del más
     * nuevo al más viejo, con quién lo hizo y el método de pago para marcar crédito y cortesía.
     *
     * @param  array{q?: ?string, service_id?: ?string, branch_id?: ?string, page?: int}  $filters
     * @param  array{from: string, to: string, start: string, end: string}  $range
     */
    public function clientServices(string $businessId, string $clientId, array $filters, array $range): array
    {
        $page = max(1, (int) ($filters['page'] ?? 1));

        // El método de pago es el de la venta ORIGINAL: una cita con abonos posteriores a crédito tiene más de una
        // transacción, y solo la primera es la venta. Subconsulta correlacionada (no un JOIN) para no duplicar filas.
        $method = '(SELECT t.method FROM transactions t WHERE t.business_id = a.business_id AND t.appointment_id = a.id '
            .'ORDER BY t.created_at ASC LIMIT 1)';

        $query = $this->base($businessId, $filters, $range)
            ->leftJoin('profiles as e', 'e.id', '=', 'a.employee_id');
        $clientId === self::NO_CLIENT
            ? $query->whereNull('a.client_id')
            : $query->where('a.client_id', $clientId);

        $rows = $query
            ->select('a.id', 'a.start_time', 'a.status', 'a.payment_status')
            ->selectRaw('s.name as service_name')
            ->selectRaw('e.full_name as employee_name')
            ->selectRaw("{$method} as payment_method")
            ->orderByDesc('a.start_time')
            ->orderBy('a.id')
            ->offset(($page - 1) * self::PAGE_SIZE)
            ->limit(self::PAGE_SIZE + 1)
            ->get();

        return [
            'visits' => $rows->take(self::PAGE_SIZE)->map(fn ($r) => [
                'id' => $r->id,
                'date' => $this->iso($r->start_time),
                'service_name' => $r->service_name,
                'employee_name' => $r->employee_name,
                // Una cita pagada sin transacción (cobro antiguo) se trata como cobrada, igual que Finanzas.
                'payment_method' => $r->payment_method ?? 'cash',
                'is_credit' => $r->payment_method === 'credito',
                'is_courtesy' => $r->payment_method === 'cortesia',
            ])->values()->all(),
            'page' => $page,
            'has_more' => $rows->count() > self::PAGE_SIZE,
        ];
    }

    /** Totales de lo buscado: cuántas clientas y visitas, y desde cuándo hasta cuándo. */
    private function summary(string $businessId, array $filters, array $range): array
    {
        $row = $this->base($businessId, $filters, $range)
            ->selectRaw('COUNT(DISTINCT a.client_id) as clients')
            ->selectRaw($this->visitsSql().' as visits')
            ->selectRaw('COUNT(DISTINCT CASE WHEN a.client_id IS NULL THEN COALESCE(CAST(a.group_id AS VARCHAR), CAST(a.id AS VARCHAR)) END) as anonymous_visits')
            ->selectRaw('MIN(a.start_time) as first_at')
            ->selectRaw('MAX(a.start_time) as last_at')
            ->first();

        return [
            'clients' => (int) ($row->clients ?? 0),
            'visits' => (int) ($row->visits ?? 0),
            'anonymous_visits' => (int) ($row->anonymous_visits ?? 0),
            'first_at' => $this->iso($row->first_at ?? null),
            'last_at' => $this->iso($row->last_at ?? null),
        ];
    }

    /** Los servicios que coinciden con la búsqueda (para poder acotar a uno), de más a menos hechos. */
    private function services(string $businessId, array $filters, array $range): array
    {
        return $this->base($businessId, $filters, $range)
            ->select('a.service_id')
            ->selectRaw('MAX(s.name) as name')
            ->selectRaw($this->visitsSql().' as visits')
            ->selectRaw('COUNT(DISTINCT a.client_id) as clients')
            ->groupBy('a.service_id')
            ->orderByRaw($this->visitsSql().' DESC')
            ->orderByRaw('MAX(s.name) ASC')
            ->limit(self::MAX_SERVICES_LISTED)
            ->get()
            ->map(fn ($r) => [
                'service_id' => $r->service_id,
                'name' => $r->name,
                'visits' => (int) $r->visits,
                'clients' => (int) $r->clients,
            ])->all();
    }

    /**
     * Servicios realizados del negocio dentro del rango y con los filtros aplicados. Siempre acotada por negocio
     * (aquí no hay scope global) y por fechas.
     *
     * @param  array<string, mixed>  $filters
     * @param  array{from: string, to: string}  $range
     */
    private function base(string $businessId, array $filters, array $range): Builder
    {
        $query = DB::table('appointments as a')
            ->join('services as s', function ($join) use ($businessId) {
                $join->on('s.id', '=', 'a.service_id')->where('s.business_id', '=', $businessId);
            })
            ->where('a.business_id', $businessId)
            // «Realizado»: completada o pagada, y nunca cancelada ni no-show.
            ->where(function ($w) {
                $w->where('a.status', 'completed')->orWhere('a.payment_status', 'paid');
            })
            ->whereNotIn('a.status', ['cancelled', 'no_show'])
            ->whereBetween('a.start_time', [$range['from'], $range['to']]);

        if (!empty($filters['branch_id'])) {
            $branchId = $filters['branch_id'];
            $query->where(fn ($q) => $q->whereNull('a.branch_id')->orWhere('a.branch_id', $branchId));
        }

        if (!empty($filters['service_id'])) {
            $query->where('a.service_id', $filters['service_id']);
        }

        $term = trim((string) ($filters['q'] ?? ''));
        if ($term !== '') {
            // Los comodines de LIKE que escriba la persona (% y _) se buscan tal cual, no como comodines.
            $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], mb_strtolower($term)).'%';
            $query->where(function ($w) use ($like) {
                foreach (['s.name', 's.category'] as $column) {
                    $w->orWhereRaw("LOWER(COALESCE({$column}, '')) LIKE ? ESCAPE '\\'", [$like]);
                }
            });
        }

        return $query;
    }

    /** Una «visita» es una por `group_id` (varios servicios en la misma visita) o una por cita si no tiene. */
    private function visitsSql(): string
    {
        return 'COUNT(DISTINCT COALESCE(CAST(a.group_id AS VARCHAR), CAST(a.id AS VARCHAR)))';
    }

    private function iso(mixed $value): ?string
    {
        return $value ? Carbon::parse($value, 'UTC')->toIso8601String() : null;
    }
}
