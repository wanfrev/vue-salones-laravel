<?php

namespace App\Services;

use App\Support\HistoryRange;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Pestaña «Movimientos» de Inventario: todo lo que entró y salió, con filtros y el detalle de cada movimiento.
 *
 * Antes la pantalla traía solo los últimos 50 movimientos y buscaba en esos 50 dentro del navegador; por eso «tortas»
 * salía incompleto y no había fechas. Aquí todo se filtra y se pagina en la base de datos, siempre dentro de un rango
 * de fechas (por defecto 30 días, como máximo 12 meses), y los totales cubren TODO lo filtrado, no solo la página.
 *
 * «Quién» tiene dos lecturas, y se devuelven aparte: `user_name` es quien registró el movimiento y `person_name` es la
 * persona a la que afecta (la clienta de una venta, o el empleado que consumió el producto).
 */
class InventoryMovementHistoryService
{
    public const PAGE_SIZE = 25;
    private const MAX_USERS_LISTED = 50;

    public const TYPES = ['purchase', 'sale', 'adjustment', 'transfer_in', 'transfer_out', 'return', 'consumption'];

    /** Movimientos relacionados (misma venta, misma transferencia) que se listan en el detalle. */
    private const MAX_RELATED = 20;

    /**
     * @throws \InvalidArgumentException si el rango es inválido o pasa de 12 meses
     * @return array{from: string, to: string, start: string, end: string}
     */
    public function resolveRange(string $businessId, ?string $start, ?string $end): array
    {
        return HistoryRange::resolve($businessId, $start, $end, 30);
    }

    /**
     * @param  array{q?: ?string, types?: ?array, direction?: ?string, product_id?: ?string, category_id?: ?string, user_id?: ?string, branch_id?: ?string, sort?: ?string, page?: int}  $filters
     * @param  array{from: string, to: string, start: string, end: string}  $range
     */
    public function list(string $businessId, array $filters, array $range): array
    {
        $page = max(1, (int) ($filters['page'] ?? 1));
        $sort = $filters['sort'] ?? 'recent';

        $rows = $this->scoped($businessId, $filters, $range)
            ->select($this->columns())
            ->when($sort === 'oldest', fn (Builder $q) => $q->orderBy('m.created_at'))
            ->when($sort === 'quantity', fn (Builder $q) => $q->orderByRaw('ABS(m.quantity) DESC')->orderByDesc('m.created_at'))
            ->when($sort === 'recent', fn (Builder $q) => $q->orderByDesc('m.created_at'))
            ->orderBy('m.id')
            ->offset(($page - 1) * self::PAGE_SIZE)
            ->limit(self::PAGE_SIZE + 1) // «uno de más»: sabe si hay otra página sin hacer un COUNT
            ->get();

        return [
            'summary' => $this->summary($businessId, $filters, $range),
            // Las opciones salen del filtro SIN acotar por ellas mismas: si no, al elegir un tipo o una persona quedaría
            // solo esa y no habría cómo volver a «Todos» ni pasar a otra.
            'types' => $this->typeCounts($businessId, Arr::except($filters, ['types']), $range),
            'users' => $this->users($businessId, Arr::except($filters, ['user_id']), $range),
            'categories' => $this->categories($businessId, Arr::except($filters, ['category_id']), $range),
            'movements' => $rows->take(self::PAGE_SIZE)->map(fn ($r) => $this->format($r))->values()->all(),
            'page' => $page,
            'has_more' => $rows->count() > self::PAGE_SIZE,
            'range' => ['start' => $range['start'], 'end' => $range['end']],
        ];
    }

    /**
     * Un movimiento con todo lo que se sabe de él: quién lo registró, a quién afecta, de dónde viene (la cita, la venta,
     * la compra, el pago al empleado…) y los demás movimientos de la misma operación. null si no es de este negocio.
     */
    public function detail(string $businessId, string $id): ?array
    {
        $row = $this->query($businessId)->select($this->columns())->where('m.id', $id)->first();
        if (!$row) {
            return null;
        }

        $movement = $this->format($row);
        $movement['exchange_rate'] = $row->exchange_rate_used !== null ? $this->number($row->exchange_rate_used) : null;

        return [
            'movement' => $movement,
            'source' => $this->source($businessId, $row),
            'related' => $this->related($businessId, $row),
        ];
    }

    // ── Consultas ────────────────────────────────────────────────────────────

    /** Movimientos del negocio con todo lo que hace falta para mostrarlos y buscarlos, sin filtros todavía. */
    private function query(string $businessId): Builder
    {
        return DB::table('inventory_movements as m')
            ->join('products as p', function ($join) use ($businessId) {
                $join->on('p.id', '=', 'm.product_id')->where('p.business_id', '=', $businessId);
            })
            ->leftJoin('product_variants as v', 'v.id', '=', 'm.variant_id')
            ->leftJoin('product_categories as cat', 'cat.id', '=', 'p.category_id')
            // Quien lo registró.
            ->leftJoin('profiles as u', 'u.id', '=', 'm.created_by')
            // A quién afecta: la clienta (la del movimiento o la de la cita a la que se vendió) o el empleado que consumió.
            ->leftJoin('appointments as a', function ($join) {
                $join->on('a.id', '=', 'm.reference_id')->where('m.reference_type', '=', 'appointment');
            })
            ->leftJoin('clients as c', 'c.id', '=', DB::raw('COALESCE(m.client_id, a.client_id)'))
            ->leftJoin('employee_payments as ep', function ($join) {
                $join->on('ep.id', '=', 'm.reference_id')->where('m.reference_type', '=', 'employee_payment');
            })
            ->leftJoin('profiles as e', 'e.id', '=', 'ep.employee_id')
            ->leftJoin('branches as b', 'b.id', '=', 'm.branch_id')
            ->leftJoin('inventory_locations as l', 'l.id', '=', 'm.location_id')
            ->where('m.business_id', $businessId);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @param  array{from: string, to: string}  $range
     */
    private function scoped(string $businessId, array $filters, array $range): Builder
    {
        $query = $this->query($businessId)->whereBetween('m.created_at', [$range['from'], $range['to']]);

        if (!empty($filters['branch_id'])) {
            $branchId = $filters['branch_id'];
            $query->where(fn ($q) => $q->whereNull('m.branch_id')->orWhere('m.branch_id', $branchId));
        }
        if (!empty($filters['types'])) {
            $query->whereIn('m.movement_type', $filters['types']);
        }
        if (($filters['direction'] ?? null) === 'in') {
            $query->where('m.quantity', '>', 0);
        } elseif (($filters['direction'] ?? null) === 'out') {
            $query->where('m.quantity', '<', 0);
        }
        if (!empty($filters['product_id'])) {
            $query->where('m.product_id', $filters['product_id']);
        }
        if (!empty($filters['category_id'])) {
            $query->where('p.category_id', $filters['category_id']);
        }
        if (!empty($filters['user_id'])) {
            $query->where('m.created_by', $filters['user_id']);
        }
        if (isset($filters['q']) && trim($filters['q']) !== '') {
            $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], mb_strtolower(trim($filters['q']))).'%';
            $query->where(function ($w) use ($like) {
                foreach (['p.name', 'p.sku', 'v.name', 'v.sku', 'cat.name', 'm.notes', 'c.full_name', 'u.full_name', 'e.full_name'] as $column) {
                    $w->orWhereRaw("LOWER(COALESCE({$column}, '')) LIKE ? ESCAPE '\\'", [$like]);
                }
            });
        }

        return $query;
    }

    /** Totales de TODO lo filtrado (no solo de la página): cuántos movimientos, cuánto entró y salió, y a qué costo. */
    private function summary(string $businessId, array $filters, array $range): array
    {
        $row = $this->scoped($businessId, $filters, $range)
            ->selectRaw('COUNT(*) as movements')
            ->selectRaw('COALESCE(SUM(CASE WHEN m.quantity > 0 THEN m.quantity ELSE 0 END), 0) as units_in')
            ->selectRaw('COALESCE(SUM(CASE WHEN m.quantity < 0 THEN -m.quantity ELSE 0 END), 0) as units_out')
            ->selectRaw('COALESCE(SUM(CASE WHEN m.quantity > 0 THEN m.quantity * m.unit_cost ELSE 0 END), 0) as cost_in')
            ->selectRaw('COALESCE(SUM(CASE WHEN m.quantity < 0 THEN -m.quantity * m.unit_cost ELSE 0 END), 0) as cost_out')
            ->first();

        return [
            'movements' => (int) $row->movements,
            'units_in' => $this->number($row->units_in),
            'units_out' => $this->number($row->units_out),
            'cost_in' => round((float) $row->cost_in, 2),
            'cost_out' => round((float) $row->cost_out, 2),
        ];
    }

    /** Cuántos movimientos hay de cada tipo (para los chips), con los demás filtros aplicados. */
    private function typeCounts(string $businessId, array $filters, array $range): array
    {
        return $this->scoped($businessId, $filters, $range)
            ->select('m.movement_type')
            ->selectRaw('COUNT(*) as movements')
            ->groupBy('m.movement_type')
            ->orderByDesc(DB::raw('COUNT(*)'))
            ->get()
            ->map(fn ($r) => ['type' => $r->movement_type, 'movements' => (int) $r->movements])
            ->values()->all();
    }

    /** Categorías de los productos que se movieron en el rango, para el filtro «Categoría». */
    private function categories(string $businessId, array $filters, array $range): array
    {
        return $this->scoped($businessId, $filters, $range)
            ->whereNotNull('p.category_id')
            ->select('p.category_id as id')
            ->selectRaw('MAX(cat.name) as name')
            ->selectRaw('COUNT(*) as movements')
            ->groupBy('p.category_id')
            ->orderByRaw('LOWER(MAX(cat.name))')
            ->limit(self::MAX_USERS_LISTED)
            ->get()
            ->map(fn ($r) => ['id' => $r->id, 'name' => $r->name ?: 'Sin nombre', 'movements' => (int) $r->movements])
            ->values()->all();
    }

    /** Quiénes registraron movimientos en el rango, para el filtro «Registrado por». */
    private function users(string $businessId, array $filters, array $range): array
    {
        return $this->scoped($businessId, $filters, $range)
            ->whereNotNull('m.created_by')
            ->select('m.created_by as id')
            ->selectRaw('MAX(u.full_name) as name')
            ->selectRaw('COUNT(*) as movements')
            ->groupBy('m.created_by')
            ->orderByDesc(DB::raw('COUNT(*)'))
            ->limit(self::MAX_USERS_LISTED)
            ->get()
            ->map(fn ($r) => ['id' => $r->id, 'name' => $r->name ?: 'Usuario sin nombre', 'movements' => (int) $r->movements])
            ->values()->all();
    }

    // ── Detalle ──────────────────────────────────────────────────────────────

    /** De dónde viene el movimiento, según su referencia. null si no hay nada más que contar. */
    private function source(string $businessId, object $m): ?array
    {
        $id = $m->reference_id;
        if (!$m->reference_type || !$id) {
            return null;
        }

        return match ($m->reference_type) {
            'appointment' => $this->appointmentSource($businessId, $id),
            'direct' => $this->saleSource($businessId, $id),
            'employee_payment' => $this->employeePaymentSource($businessId, $id),
            'purchase_invoice' => $this->purchaseSource($businessId, $id),
            default => ['kind' => $m->reference_type],
        };
    }

    private function appointmentSource(string $businessId, string $id): array
    {
        $row = DB::table('appointments as a')
            ->leftJoin('services as s', 's.id', '=', 'a.service_id')
            ->leftJoin('clients as c', 'c.id', '=', 'a.client_id')
            ->leftJoin('profiles as e', 'e.id', '=', 'a.employee_id')
            ->where('a.business_id', $businessId)->where('a.id', $id)
            ->select('a.status', 'a.start_time', 's.name as service', 'c.full_name as client', 'c.phone as client_phone', 'e.full_name as employee')
            ->first();

        return $row
            ? ['kind' => 'appointment', 'date' => $this->iso($row->start_time), 'status' => $row->status, 'service' => $row->service, 'client' => $row->client, 'client_phone' => $row->client_phone, 'employee' => $row->employee]
            : ['kind' => 'appointment', 'missing' => true];
    }

    private function saleSource(string $businessId, string $id): array
    {
        $row = DB::table('transactions as t')
            ->where('t.business_id', $businessId)->where('t.id', $id)
            ->select('t.method', 't.total_amount', 't.created_at')
            ->first();

        return $row
            ? ['kind' => 'sale', 'date' => $this->iso($row->created_at), 'method' => $row->method, 'total' => round((float) $row->total_amount, 2)]
            : ['kind' => 'sale', 'missing' => true];
    }

    private function employeePaymentSource(string $businessId, string $id): array
    {
        $row = DB::table('employee_payments as ep')
            ->leftJoin('profiles as e', 'e.id', '=', 'ep.employee_id')
            ->where('ep.business_id', $businessId)->where('ep.id', $id)
            ->select('ep.type', 'ep.concept', 'ep.notes', 'ep.amount', 'ep.payment_date', 'e.full_name as employee')
            ->first();

        return $row
            ? ['kind' => 'employee_payment', 'employee' => $row->employee, 'type' => $row->type, 'concept' => $row->concept, 'notes' => $row->notes, 'amount' => round((float) $row->amount, 2), 'date' => $row->payment_date ? (string) $row->payment_date : null]
            : ['kind' => 'employee_payment', 'missing' => true];
    }

    private function purchaseSource(string $businessId, string $id): array
    {
        $row = DB::table('purchase_invoices as i')
            ->leftJoin('suppliers as s', 's.id', '=', 'i.supplier_id')
            ->where('i.business_id', $businessId)->where('i.id', $id)
            ->select('i.invoice_number', 'i.invoice_date', 'i.total', 's.name as supplier')
            ->first();

        return $row
            ? ['kind' => 'purchase_invoice', 'invoice_number' => $row->invoice_number, 'date' => $row->invoice_date ? substr((string) $row->invoice_date, 0, 10) : null, 'total' => round((float) $row->total, 2), 'supplier' => $row->supplier]
            : ['kind' => 'purchase_invoice', 'missing' => true];
    }

    /** Los demás movimientos de la misma operación (otras líneas de la venta, el otro lado de la transferencia…). */
    private function related(string $businessId, object $m): array
    {
        if (!$m->reference_type || !$m->reference_id) {
            return [];
        }

        return $this->query($businessId)
            ->where('m.reference_type', $m->reference_type)
            ->where('m.reference_id', $m->reference_id)
            ->where('m.id', '<>', $m->id)
            ->select('m.id', 'm.created_at', 'm.movement_type', 'm.quantity', 'p.name as product_name', 'v.name as variant_name', 'b.name as branch_name')
            ->orderBy('m.created_at')
            ->limit(self::MAX_RELATED)
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'date' => $this->iso($r->created_at),
                'type' => $r->movement_type,
                'quantity' => $this->number($r->quantity),
                'product_name' => $r->product_name,
                'variant_name' => $r->variant_name,
                'branch_name' => $r->branch_name,
            ])->values()->all();
    }

    // ── Formato ──────────────────────────────────────────────────────────────

    /** @return list<string|\Illuminate\Contracts\Database\Query\Expression> */
    private function columns(): array
    {
        return [
            'm.id', 'm.created_at', 'm.movement_type', 'm.quantity', 'm.unit_cost', 'm.exchange_rate_used', 'm.notes',
            'm.reference_type', 'm.reference_id', 'm.product_id',
            DB::raw('p.name as product_name'), DB::raw('p.sku as product_sku'), DB::raw('v.name as variant_name'),
            DB::raw('cat.name as category_name'),
            DB::raw('u.full_name as user_name'), DB::raw('c.full_name as client_name'), DB::raw('e.full_name as employee_name'),
            DB::raw('b.name as branch_name'), DB::raw('l.name as location_name'),
        ];
    }

    private function format(object $r): array
    {
        $quantity = $this->number($r->quantity);
        $unitCost = round((float) $r->unit_cost, 2);

        return [
            'id' => $r->id,
            'date' => $this->iso($r->created_at),
            'type' => $r->movement_type,
            'quantity' => $quantity,
            'unit_cost' => $unitCost,
            'total_cost' => round(abs($quantity) * $unitCost, 2),
            'notes' => $r->notes,
            'reference_type' => $r->reference_type,
            'product_id' => $r->product_id,
            'product_name' => $r->product_name,
            'product_sku' => $r->product_sku,
            'variant_name' => $r->variant_name,
            'category_name' => $r->category_name,
            'user_name' => $r->user_name,
            // La persona a la que afecta: la clienta de la venta o el empleado que consumió.
            'person_name' => $r->client_name ?: $r->employee_name,
            'person_role' => $r->client_name ? 'client' : ($r->employee_name ? 'employee' : null),
            'branch_name' => $r->branch_name,
            'location_name' => $r->location_name,
        ];
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
