<?php

namespace App\Services;

use App\Support\HistoryRange;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Qué clientas compraron o se hicieron «tinte» (o lo que se busque), para filtrar el directorio de Clientes:
 * «los que lo compraron o se lo hicieron» y «los que no han vuelto desde hace N días» (avisarles del retoque).
 *
 * Mira juntos los PRODUCTOS vendidos (movimientos de inventario de tipo venta) y los SERVICIOS realizados (citas
 * completadas o pagadas, nunca canceladas ni no-show): «tinte» encuentra a quien se llevó el producto y a quien se
 * hizo el servicio. Por cada clienta devuelve la última y la primera vez, cuántas veces y qué fue lo último.
 *
 * El rango es siempre el último año (el máximo de los historiales). Las ventas o citas sin clienta registrada no
 * se pueden atribuir a nadie y quedan fuera. Cuántos días llevan sin volver lo calcula la pantalla con
 * `last_at`, así cambiar ese número no vuelve a consultar.
 */
class ClientItemHistoryService
{
    /** Cuántas clientas devuelve como máximo (las más recientes primero); `truncated` avisa si había más. */
    public const MAX_CLIENTS = 2000;

    /** Días que se miran hacia atrás: un año completo. */
    public const LOOKBACK_DAYS = 365;

    /**
     * @throws \InvalidArgumentException si el rango es inválido
     * @return array{from: string, to: string, start: string, end: string}
     */
    public function resolveRange(string $businessId): array
    {
        return HistoryRange::resolve($businessId, null, null, self::LOOKBACK_DAYS);
    }

    /**
     * @param  array{q: string, branch_id?: ?string}  $filters
     * @param  array{from: string, to: string, start: string, end: string}  $range
     * @return array{clients: list<array<string, mixed>>, truncated: bool, range: array{start: string, end: string}}
     */
    public function matches(string $businessId, array $filters, array $range): array
    {
        $union = $this->products($businessId, $filters, $range)->unionAll($this->services($businessId, $filters, $range));

        // Una sola fila por clienta con sus totales. «Veces» cuenta visitas distintas ENTRE producto y servicio: la clienta
        // que se hizo el tinte y se llevó el producto en la misma cita cuenta una vez.
        $rows = DB::query()->fromSub($union, 'u')
            ->select('u.client_id')
            ->selectRaw('MAX(u.at) as last_at')
            ->selectRaw('MIN(u.at) as first_at')
            ->selectRaw('COUNT(DISTINCT u.visit_key) as times')
            ->groupBy('u.client_id')
            ->orderByRaw('MAX(u.at) DESC')
            ->orderBy('u.client_id')
            ->limit(self::MAX_CLIENTS + 1) // «uno de más»: sabe si había más sin hacer un COUNT
            ->get();

        $truncated = $rows->count() > self::MAX_CLIENTS;
        $rows = $rows->take(self::MAX_CLIENTS);

        $lastItems = $this->lastItems($union, $rows->pluck('client_id')->all());

        return [
            'clients' => $rows->map(fn ($r) => [
                'client_id' => $r->client_id,
                'last_at' => $this->iso($r->last_at),
                'first_at' => $this->iso($r->first_at),
                'times' => (int) $r->times,
                'last_item' => $lastItems[$r->client_id] ?? null,
            ])->values()->all(),
            'truncated' => $truncated,
            'range' => ['start' => $range['start'], 'end' => $range['end']],
        ];
    }

    /**
     * Lo último que cada clienta compró o se hizo (el nombre del producto o servicio de su fecha más reciente).
     * Se saca de las filas por (clienta, producto/servicio), que son pocas, y se reduce aquí: así no hace falta una
     * función de ventana que no tienen todas las bases.
     *
     * @param  list<string>  $clientIds
     * @return array<string, string>
     */
    private function lastItems(Builder $union, array $clientIds): array
    {
        if ($clientIds === []) {
            return [];
        }

        $latest = [];
        foreach (array_chunk($clientIds, 500) as $chunk) {
            $rows = DB::query()->fromSub($union, 'u')
                ->select('u.client_id', 'u.item')
                ->selectRaw('MAX(u.at) as at')
                ->whereIn('u.client_id', $chunk)
                ->groupBy('u.client_id', 'u.item')
                ->get();

            foreach ($rows as $r) {
                if (!isset($latest[$r->client_id]) || $r->at > $latest[$r->client_id]['at']) {
                    $latest[$r->client_id] = ['at' => $r->at, 'item' => $r->item];
                }
            }
        }

        return array_map(fn ($v) => $v['item'], $latest);
    }

    /** Productos vendidos a una clienta (la del movimiento o, si no tiene, la de la cita a la que se vendió). */
    private function products(string $businessId, array $filters, array $range): Builder
    {
        $client = 'COALESCE(m.client_id, a.client_id)';

        $query = DB::table('inventory_movements as m')
            ->join('products as p', function ($join) use ($businessId) {
                $join->on('p.id', '=', 'm.product_id')->where('p.business_id', '=', $businessId);
            })
            ->leftJoin('product_variants as v', 'v.id', '=', 'm.variant_id')
            ->leftJoin('appointments as a', function ($join) {
                $join->on('a.id', '=', 'm.reference_id')->where('m.reference_type', '=', 'appointment');
            })
            ->selectRaw("{$client} as client_id")
            ->selectRaw('m.created_at as at')
            ->selectRaw('COALESCE(CAST(m.reference_id AS VARCHAR), CAST(m.id AS VARCHAR)) as visit_key')
            ->selectRaw('p.name as item')
            ->where('m.business_id', $businessId)
            ->where('m.movement_type', 'sale')
            ->whereRaw("{$client} IS NOT NULL")
            ->whereBetween('m.created_at', [$range['from'], $range['to']]);

        if (!empty($filters['branch_id'])) {
            $branchId = $filters['branch_id'];
            $query->where(fn ($q) => $q->whereNull('m.branch_id')->orWhere('m.branch_id', $branchId));
        }

        return $this->matching($query, $filters['q'], ['p.name', 'p.sku', 'v.name', 'v.sku']);
    }

    /** Servicios realizados a una clienta. «Realizado» = completada o pagada, y nunca cancelada ni no-show. */
    private function services(string $businessId, array $filters, array $range): Builder
    {
        $query = DB::table('appointments as a')
            ->join('services as s', function ($join) use ($businessId) {
                $join->on('s.id', '=', 'a.service_id')->where('s.business_id', '=', $businessId);
            })
            ->selectRaw('a.client_id as client_id')
            ->selectRaw('a.start_time as at')
            ->selectRaw('COALESCE(CAST(a.group_id AS VARCHAR), CAST(a.id AS VARCHAR)) as visit_key')
            ->selectRaw('s.name as item')
            ->where('a.business_id', $businessId)
            ->whereNotNull('a.client_id')
            ->where(function ($w) {
                $w->where('a.status', 'completed')->orWhere('a.payment_status', 'paid');
            })
            ->whereNotIn('a.status', ['cancelled', 'no_show'])
            ->whereBetween('a.start_time', [$range['from'], $range['to']]);

        if (!empty($filters['branch_id'])) {
            $branchId = $filters['branch_id'];
            $query->where(fn ($q) => $q->whereNull('a.branch_id')->orWhere('a.branch_id', $branchId));
        }

        return $this->matching($query, $filters['q'], ['s.name', 's.category']);
    }

    /**
     * Filtra por el texto buscado en las columnas dadas, sin distinguir mayúsculas; los comodines de LIKE que escriba
     * la persona (% y _) se buscan tal cual, no como comodines.
     *
     * @param  list<string>  $columns
     */
    private function matching(Builder $query, string $term, array $columns): Builder
    {
        $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], mb_strtolower(trim($term))).'%';

        return $query->where(function ($w) use ($like, $columns) {
            foreach ($columns as $column) {
                $w->orWhereRaw("LOWER(COALESCE({$column}, '')) LIKE ? ESCAPE '\\'", [$like]);
            }
        });
    }

    private function iso(mixed $value): ?string
    {
        return $value ? Carbon::parse($value, 'UTC')->toIso8601String() : null;
    }
}
