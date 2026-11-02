<?php

namespace App\Services;

use Illuminate\Database\Query\Builder;
use App\Support\HistoryRange;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Historial de compras POR PRODUCTO: quién compró tinte, shampoo, una cartera… y desde cuándo.
 *
 * Sale de los movimientos de inventario de tipo `sale` (cada venta de producto, suelta o junto con una cita).
 * La clienta es la del propio movimiento (venta directa) o, si no tiene, la de la cita a la que se vendió;
 * una venta sin clienta se agrupa aparte («sin clienta registrada»). Todo se calcula en la base de datos y el
 * rango de fechas siempre está acotado (por defecto 90 días, como máximo 12 meses).
 *
 * Se incluyen TODAS las ventas, también las a crédito y las cortesías: cada una trae su método de pago para
 * que la pantalla la marque. Es distinto de Finanzas, que excluye esas dos porque no son ingreso cobrado.
 */
class ProductSalesHistoryService
{
    public const PAGE_SIZE = 25;
    private const MAX_PRODUCTS_LISTED = 30;

    /** Valor de `client_id` en el detalle para pedir las ventas sin clienta. */
    public const NO_CLIENT = 'none';

    /**
     * Resuelve el rango pedido (fechas locales del negocio) a UTC. Ver HistoryRange.
     *
     * @throws \InvalidArgumentException si el rango es inválido o pasa de 12 meses
     * @return array{from: string, to: string, start: string, end: string}
     */
    public function resolveRange(string $businessId, ?string $start, ?string $end): array
    {
        return HistoryRange::resolve($businessId, $start, $end);
    }

    /**
     * Compradoras del producto buscado: una fila por clienta, con cuántas veces compró, cuántas unidades y la
     * primera y la última compra; más el resumen general y los productos que coinciden con la búsqueda.
     *
     * @param  array{q?: ?string, product_id?: ?string, branch_id?: ?string, sort?: ?string, page?: int}  $filters
     * @param  array{from: string, to: string, start: string, end: string}  $range
     */
    public function byClient(string $businessId, array $filters, array $range): array
    {
        $page = max(1, (int) ($filters['page'] ?? 1));
        $sort = $filters['sort'] ?? 'recent';
        $clientExpr = 'COALESCE(m.client_id, a.client_id)';

        $rows = $this->base($businessId, $filters, $range)
            ->selectRaw("{$clientExpr} as client_id")
            ->selectRaw('MAX(c.full_name) as client_name')
            ->selectRaw('MAX(c.phone) as client_phone')
            ->selectRaw($this->purchasesSql().' as purchases')
            ->selectRaw('ABS(SUM(m.quantity)) as units')
            ->selectRaw('MIN(m.created_at) as first_at')
            ->selectRaw('MAX(m.created_at) as last_at')
            ->groupByRaw($clientExpr)
            // La fila «sin clienta» siempre al final, ordenen como ordenen.
            ->orderByRaw("CASE WHEN {$clientExpr} IS NULL THEN 1 ELSE 0 END")
            ->when($sort === 'units', fn (Builder $q) => $q->orderByRaw('ABS(SUM(m.quantity)) DESC'))
            ->when($sort === 'name', fn (Builder $q) => $q->orderByRaw('LOWER(MAX(c.full_name)) ASC'))
            ->orderByRaw('MAX(m.created_at) DESC')
            ->offset(($page - 1) * self::PAGE_SIZE)
            ->limit(self::PAGE_SIZE + 1) // «uno de más»: sabe si hay otra página sin hacer un COUNT
            ->get();

        $hasMore = $rows->count() > self::PAGE_SIZE;

        return [
            'summary' => $this->summary($businessId, $filters, $range),
            // Las opciones de producto salen de la búsqueda SIN acotar a un producto: si no, al elegir uno quedaría solo ese
            // y no habría cómo volver a «Todos» ni pasar a otro.
            'products' => $this->products($businessId, Arr::except($filters, ['product_id']), $range),
            'clients' => $rows->take(self::PAGE_SIZE)->map(fn ($r) => [
                'client_id' => $r->client_id,
                'client_name' => $r->client_name,
                'client_phone' => $r->client_phone,
                'purchases' => (int) $r->purchases,
                'units' => $this->number($r->units),
                'first_at' => $this->iso($r->first_at),
                'last_at' => $this->iso($r->last_at),
            ])->values()->all(),
            'page' => $page,
            'has_more' => $hasMore,
            'range' => ['start' => $range['start'], 'end' => $range['end']],
        ];
    }

    /**
     * Las compras de UNA clienta (o de las ventas sin clienta, con NO_CLIENT) del producto buscado, de la más
     * nueva a la más vieja, con el método de pago para marcar crédito y cortesía.
     *
     * @param  array{q?: ?string, product_id?: ?string, branch_id?: ?string, page?: int}  $filters
     * @param  array{from: string, to: string, start: string, end: string}  $range
     */
    public function clientSales(string $businessId, string $clientId, array $filters, array $range): array
    {
        $page = max(1, (int) ($filters['page'] ?? 1));
        $clientExpr = 'COALESCE(m.client_id, a.client_id)';

        // El método de pago es el de la venta ORIGINAL: una cita con abonos posteriores a crédito tiene más de una
        // transacción, y solo la primera es la venta. Subconsulta correlacionada (no un JOIN) para no duplicar filas.
        $method = "(SELECT t.method FROM transactions t WHERE t.business_id = m.business_id AND ("
            ."(m.reference_type = 'direct' AND t.id = m.reference_id) OR "
            ."(m.reference_type = 'appointment' AND t.appointment_id = m.reference_id)"
            .') ORDER BY t.created_at ASC LIMIT 1)';

        $query = $this->base($businessId, $filters, $range);
        $clientId === self::NO_CLIENT
            ? $query->whereRaw("{$clientExpr} IS NULL")
            : $query->whereRaw("{$clientExpr} = ?", [$clientId]);

        $rows = $query
            ->select('m.id', 'm.created_at', 'm.reference_type', 'm.notes')
            ->selectRaw('ABS(m.quantity) as quantity')
            ->selectRaw('p.name as product_name')
            ->selectRaw('v.name as variant_name')
            ->selectRaw("{$method} as payment_method")
            ->orderByDesc('m.created_at')
            ->orderBy('m.id')
            ->offset(($page - 1) * self::PAGE_SIZE)
            ->limit(self::PAGE_SIZE + 1)
            ->get();

        return [
            'sales' => $rows->take(self::PAGE_SIZE)->map(fn ($r) => [
                'id' => $r->id,
                'date' => $this->iso($r->created_at),
                'product_name' => $r->product_name,
                'variant_name' => $r->variant_name,
                'quantity' => $this->number($r->quantity),
                // Sin transacción (venta desde Inventario) se trata como cobrada en el momento, igual que Finanzas.
                'payment_method' => $r->payment_method ?? 'cash',
                'is_credit' => $r->payment_method === 'credito',
                'is_courtesy' => $r->payment_method === 'cortesia',
                'notes' => $r->notes,
            ])->values()->all(),
            'page' => $page,
            'has_more' => $rows->count() > self::PAGE_SIZE,
        ];
    }

    /** Totales de lo buscado: cuántas clientas, compras y unidades, y desde cuándo hasta cuándo. */
    private function summary(string $businessId, array $filters, array $range): array
    {
        $clientExpr = 'COALESCE(m.client_id, a.client_id)';
        $row = $this->base($businessId, $filters, $range)
            ->selectRaw("COUNT(DISTINCT {$clientExpr}) as buyers")
            ->selectRaw($this->purchasesSql().' as purchases')
            ->selectRaw('ABS(SUM(m.quantity)) as units')
            ->selectRaw("COUNT(DISTINCT CASE WHEN {$clientExpr} IS NULL THEN COALESCE(CAST(m.reference_id AS VARCHAR), CAST(m.id AS VARCHAR)) END) as anonymous_purchases")
            ->selectRaw('MIN(m.created_at) as first_at')
            ->selectRaw('MAX(m.created_at) as last_at')
            ->first();

        return [
            'buyers' => (int) ($row->buyers ?? 0),
            'purchases' => (int) ($row->purchases ?? 0),
            'units' => $this->number($row->units ?? 0),
            'anonymous_purchases' => (int) ($row->anonymous_purchases ?? 0),
            'first_at' => $this->iso($row->first_at ?? null),
            'last_at' => $this->iso($row->last_at ?? null),
        ];
    }

    /** Los productos que coinciden con la búsqueda (para poder acotar a uno), de más a menos vendido. */
    private function products(string $businessId, array $filters, array $range): array
    {
        $clientExpr = 'COALESCE(m.client_id, a.client_id)';

        return $this->base($businessId, $filters, $range)
            ->select('m.product_id')
            ->selectRaw('MAX(p.name) as name')
            ->selectRaw('ABS(SUM(m.quantity)) as units')
            ->selectRaw("COUNT(DISTINCT {$clientExpr}) as buyers")
            ->groupBy('m.product_id')
            ->orderByRaw('ABS(SUM(m.quantity)) DESC')
            ->orderByRaw('MAX(p.name) ASC')
            ->limit(self::MAX_PRODUCTS_LISTED)
            ->get()
            ->map(fn ($r) => [
                'product_id' => $r->product_id,
                'name' => $r->name,
                'units' => $this->number($r->units),
                'buyers' => (int) $r->buyers,
            ])->all();
    }

    /**
     * Ventas de producto del negocio dentro del rango y con los filtros aplicados. Siempre acotada por negocio
     * (aquí no hay scope global) y por fechas; el movimiento ya lleva la fecha de cobro (ver InventoryService).
     *
     * @param  array<string, mixed>  $filters
     * @param  array{from: string, to: string}  $range
     */
    private function base(string $businessId, array $filters, array $range): Builder
    {
        $query = DB::table('inventory_movements as m')
            ->join('products as p', function ($join) use ($businessId) {
                $join->on('p.id', '=', 'm.product_id')->where('p.business_id', '=', $businessId);
            })
            ->leftJoin('product_variants as v', 'v.id', '=', 'm.variant_id')
            ->leftJoin('appointments as a', function ($join) {
                $join->on('a.id', '=', 'm.reference_id')->where('m.reference_type', '=', 'appointment');
            })
            ->leftJoin('clients as c', function ($join) {
                $join->on('c.id', '=', DB::raw('COALESCE(m.client_id, a.client_id)'));
            })
            ->where('m.business_id', $businessId)
            ->where('m.movement_type', 'sale')
            ->whereBetween('m.created_at', [$range['from'], $range['to']]);

        if (!empty($filters['branch_id'])) {
            $branchId = $filters['branch_id'];
            $query->where(fn ($q) => $q->whereNull('m.branch_id')->orWhere('m.branch_id', $branchId));
        }

        if (!empty($filters['product_id'])) {
            $query->where('m.product_id', $filters['product_id']);
        }

        $term = trim((string) ($filters['q'] ?? ''));
        if ($term !== '') {
            // Los comodines de LIKE que escriba la persona (% y _) se buscan tal cual, no como comodines.
            $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], mb_strtolower($term)).'%';
            $query->where(function ($w) use ($like) {
                foreach (['p.name', 'p.sku', 'v.name', 'v.sku'] as $column) {
                    $w->orWhereRaw("LOWER(COALESCE({$column}, '')) LIKE ? ESCAPE '\\'", [$like]);
                }
            });
        }

        return $query;
    }

    /**
     * Una «compra» es una venta (una cita o un cobro): si en la misma venta se llevó dos productos que coinciden con
     * la búsqueda, cuenta una vez.
     */
    private function purchasesSql(): string
    {
        return 'COUNT(DISTINCT COALESCE(CAST(m.reference_id AS VARCHAR), CAST(m.id AS VARCHAR)))';
    }

    private function number(mixed $value): float
    {
        return round((float) $value, 3);
    }

    private function iso(mixed $value): ?string
    {
        return $value ? Carbon::parse($value, 'UTC')->toIso8601String() : null;
    }
}
