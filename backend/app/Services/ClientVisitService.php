<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Business;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Historial de visitas de UN cliente: citas (varios servicios de una misma visita comparten
 * group_id y salen en una sola fila) más las ventas directas del POS que quedaron a su nombre.
 *
 * - Paginado en el servidor con "uno de más" (sin COUNT): has_more indica si hay otra página.
 * - El resumen (totales, saldo, última/próxima visita) se agrega en SQL y solo se manda en la
 *   primera página; no depende del filtro de fechas de la lista.
 * - Una visita es "attended" si alguna de sus citas está completada o pagada; "cancelled" /
 *   "no_show" si todas se cancelaron o no asistió (no suman al total facturado); si no, "pending".
 * - Las ventas directas se leen de inventory_movements.client_id (el POS lo guarda desde siempre),
 *   así que también aparecen las ventas anteriores a esta pantalla.
 * - Solo SQL portable (CAST/COALESCE/CASE/MIN/MAX): las pruebas corren en SQLite.
 */
class ClientVisitService
{
    public const PER_PAGE = 20;

    public function __construct(private ClientService $clients) {}

    /**
     * @return array{data: array<int, array<string, mixed>>, meta: array<string, mixed>, summary?: array<string, mixed>}
     */
    public function page(
        string $businessId,
        string $clientId,
        int $page = 1,
        ?string $from = null,
        ?string $to = null,
        bool $includeInternalNotes = false,
    ): array {
        $this->clients->findForBusiness($clientId, $businessId); // 404 si es de otro negocio

        $page = max(1, $page);
        [$fromUtc, $toUtc] = $this->range($businessId, $from, $to);

        $rows = $this->pageKeys($businessId, $clientId, $fromUtc, $toUtc, $page);
        $hasMore = count($rows) > self::PER_PAGE;
        $rows = array_slice($rows, 0, self::PER_PAGE);

        $result = [
            'data' => $this->hydrate($businessId, $clientId, $rows, $includeInternalNotes),
            'meta' => ['page' => $page, 'per_page' => self::PER_PAGE, 'has_more' => $hasMore],
        ];
        if ($page === 1) {
            $result['summary'] = $this->summary($businessId, $clientId);
        }

        return $result;
    }

    /** @return array<string, mixed> */
    public function summary(string $businessId, string $clientId): array
    {
        $now = Carbon::now('UTC')->format('Y-m-d H:i:s');

        $a = DB::selectOne("
            SELECT
              COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN g.any_attended = 1 THEN 1 ELSE 0 END), 0) AS attended,
              COALESCE(SUM(CASE WHEN g.any_attended = 0 AND g.all_inactive = 1 AND g.any_no_show = 0 THEN 1 ELSE 0 END), 0) AS cancelled,
              COALESCE(SUM(CASE WHEN g.any_attended = 0 AND g.all_inactive = 1 AND g.any_no_show = 1 THEN 1 ELSE 0 END), 0) AS no_show,
              COALESCE(SUM(CASE WHEN g.any_attended = 0 AND g.all_inactive = 0 THEN 1 ELSE 0 END), 0) AS pending,
              COALESCE(SUM(g.billed), 0) AS billed,
              COALESCE(SUM(g.paid), 0) AS paid,
              COALESCE(SUM(g.owed), 0) AS owed,
              MAX(CASE WHEN g.any_attended = 1 AND g.visited_at <= ? THEN g.visited_at END) AS last_visit,
              MIN(CASE WHEN g.any_attended = 0 AND g.all_inactive = 0 AND g.visited_at > ? THEN g.visited_at END) AS next_visit
            FROM (
              SELECT
                MIN(a.start_time) AS visited_at,
                MAX(CASE WHEN a.status = 'completed' OR a.payment_status = 'paid' THEN 1 ELSE 0 END) AS any_attended,
                MIN(CASE WHEN a.status IN ('cancelled', 'no_show') THEN 1 ELSE 0 END) AS all_inactive,
                MAX(CASE WHEN a.status = 'no_show' THEN 1 ELSE 0 END) AS any_no_show,
                SUM(CASE WHEN a.status IN ('cancelled', 'no_show') THEN 0 ELSE COALESCE(a.price_override, s.price, 0) END) AS billed,
                SUM(CASE WHEN a.status IN ('cancelled', 'no_show') THEN 0
                         WHEN a.payment_status = 'paid' THEN COALESCE(a.price_override, s.price, 0) ELSE 0 END) AS paid,
                SUM(CASE WHEN a.status = 'completed' AND a.payment_status <> 'paid'
                         THEN COALESCE(a.price_override, s.price, 0) ELSE 0 END) AS owed
              FROM appointments a
              LEFT JOIN services s ON s.id = a.service_id AND s.business_id = a.business_id
              WHERE a.business_id = ? AND a.client_id = ?
              GROUP BY COALESCE(a.group_id, a.id)
            ) g
        ", [$now, $now, $businessId, $clientId]);

        $s = DB::selectOne("
            SELECT COUNT(*) AS n, COALESCE(SUM(x.amount), 0) AS total, MAX(x.visited_at) AS last_sale
            FROM (
              SELECT CAST(m.reference_id AS TEXT) AS vkey,
                     MIN(COALESCE(t.paid_at, m.created_at)) AS visited_at,
                     MAX(COALESCE(t.total_amount, 0)) AS amount
              FROM inventory_movements m
              LEFT JOIN transactions t ON CAST(t.id AS TEXT) = CAST(m.reference_id AS TEXT) AND t.business_id = m.business_id
              WHERE m.business_id = ? AND m.client_id = ? AND m.reference_type = 'direct' AND m.movement_type = 'sale'
              GROUP BY m.reference_id
            ) x
        ", [$businessId, $clientId]);

        $lastVisit = collect([$a->last_visit ?? null, $s->last_sale ?? null])
            ->filter()->map(fn ($v) => $this->iso($v))->sortDesc()->first();

        return [
            'total_visits' => (int) $a->total + (int) $s->n,
            'attended' => (int) $a->attended,
            'pending' => (int) $a->pending,
            'cancelled' => (int) $a->cancelled,
            'no_show' => (int) $a->no_show,
            'direct_sales' => (int) $s->n,
            'direct_sales_total' => round((float) $s->total, 2),
            'total_billed' => round((float) $a->billed, 2),
            'total_paid' => round((float) $a->paid, 2),
            'balance' => round((float) $a->owed, 2),
            'last_visit' => $lastVisit,
            'next_visit' => $a->next_visit ? $this->iso($a->next_visit) : null,
        ];
    }

    /** @return array{0: ?string, 1: ?string} límites en UTC (el día se mide en la zona del negocio) */
    private function range(string $businessId, ?string $from, ?string $to): array
    {
        if (!$from && !$to) {
            return [null, null];
        }
        $tz = Business::find($businessId)?->timezone ?: 'UTC';
        $fromUtc = $from ? Carbon::createFromFormat('Y-m-d', $from, $tz)->startOfDay()->utc()->format('Y-m-d H:i:s') : null;
        $toUtc = $to ? Carbon::createFromFormat('Y-m-d', $to, $tz)->endOfDay()->utc()->format('Y-m-d H:i:s') : null;

        return [$fromUtc, $toUtc];
    }

    /** @return array<int, object> filas {kind, vkey, visited_at}, una de más para saber si hay otra página */
    private function pageKeys(string $businessId, string $clientId, ?string $fromUtc, ?string $toUtc, int $page): array
    {
        $apptBindings = [$businessId, $clientId];
        $apptDate = '';
        $saleBindings = [$businessId, $clientId];
        $saleDate = '';
        if ($fromUtc) {
            $apptDate .= ' AND a.start_time >= ?';
            $apptBindings[] = $fromUtc;
            $saleDate .= ' AND COALESCE(t.paid_at, m.created_at) >= ?';
            $saleBindings[] = $fromUtc;
        }
        if ($toUtc) {
            $apptDate .= ' AND a.start_time <= ?';
            $apptBindings[] = $toUtc;
            $saleDate .= ' AND COALESCE(t.paid_at, m.created_at) <= ?';
            $saleBindings[] = $toUtc;
        }

        return DB::select("
            SELECT kind, vkey, visited_at FROM (
              SELECT 'appointment' AS kind, CAST(COALESCE(a.group_id, a.id) AS TEXT) AS vkey, MIN(a.start_time) AS visited_at
              FROM appointments a
              WHERE a.business_id = ? AND a.client_id = ? {$apptDate}
              GROUP BY COALESCE(a.group_id, a.id)
              UNION ALL
              SELECT 'sale' AS kind, CAST(m.reference_id AS TEXT) AS vkey, MIN(COALESCE(t.paid_at, m.created_at)) AS visited_at
              FROM inventory_movements m
              LEFT JOIN transactions t ON CAST(t.id AS TEXT) = CAST(m.reference_id AS TEXT) AND t.business_id = m.business_id
              WHERE m.business_id = ? AND m.client_id = ? AND m.reference_type = 'direct' AND m.movement_type = 'sale' {$saleDate}
              GROUP BY m.reference_id
            ) v
            ORDER BY visited_at DESC, vkey DESC
            LIMIT ? OFFSET ?
        ", array_merge($apptBindings, $saleBindings, [self::PER_PAGE + 1, ($page - 1) * self::PER_PAGE]));
    }

    /**
     * @param array<int, object> $rows
     * @return array<int, array<string, mixed>>
     */
    private function hydrate(string $businessId, string $clientId, array $rows, bool $includeInternalNotes): array
    {
        $apptKeys = collect($rows)->where('kind', 'appointment')->pluck('vkey')->all();
        $saleKeys = collect($rows)->where('kind', 'sale')->pluck('vkey')->all();

        $groups = $apptKeys ? $this->appointmentGroups($businessId, $clientId, $apptKeys) : collect();
        $apptIds = $groups->flatten(1)->pluck('id')->all();
        $txByAppt = $apptIds
            ? Transaction::where('business_id', $businessId)->whereIn('appointment_id', $apptIds)
                ->get(['id', 'appointment_id', 'method', 'total_amount', 'tip_amount', 'payments_breakdown', 'paid_at'])
                ->groupBy('appointment_id')
            : collect();
        $productsByRef = $this->products($businessId, array_merge($apptIds, $saleKeys));
        $sales = $saleKeys
            ? Transaction::where('business_id', $businessId)->whereIn('id', $saleKeys)->get()->keyBy('id')
            : collect();

        $out = [];
        foreach ($rows as $row) {
            if ($row->kind === 'sale') {
                $tx = $sales->get($row->vkey);
                $out[] = [
                    'id' => $row->vkey,
                    'kind' => 'sale',
                    'date' => $this->iso($row->visited_at),
                    'state' => 'attended',
                    'services' => [],
                    'products' => $productsByRef->get($row->vkey, []),
                    'amount' => $tx ? round((float) $tx->total_amount, 2) : 0.0,
                    'payment_status' => 'paid',
                    'payments' => $tx ? $this->payments(collect([$tx])) : [],
                    'notes' => $tx?->notes,
                    'internal_notes' => null,
                ];
                continue;
            }

            $appts = $groups->get($row->vkey, collect());
            if ($appts->isEmpty()) {
                continue;
            }
            $out[] = $this->appointmentVisit($row, $appts, $txByAppt, $productsByRef, $includeInternalNotes);
        }

        return $out;
    }

    /** @return Collection<string, Collection<int, Appointment>> citas de la página, por visita (group_id o id) */
    private function appointmentGroups(string $businessId, string $clientId, array $keys): Collection
    {
        return Appointment::query()
            ->with(['service:id,name,price', 'employeeProfile:id,full_name', 'assistantProfile:id,full_name'])
            ->where('business_id', $businessId)
            ->where('client_id', $clientId)
            ->where(fn ($q) => $q->whereIn('group_id', $keys)->orWhereIn('id', $keys))
            ->orderBy('start_time')
            ->get()
            ->groupBy(fn (Appointment $a) => (string) ($a->group_id ?? $a->id));
    }

    /** @return Collection<string, array<int, array{name: string, quantity: float}>> productos por referencia */
    private function products(string $businessId, array $refs): Collection
    {
        if (!$refs) {
            return collect();
        }

        return DB::table('inventory_movements as m')
            ->join('products as p', 'p.id', '=', 'm.product_id')
            ->leftJoin('product_variants as pv', 'pv.id', '=', 'm.variant_id')
            ->where('m.business_id', $businessId)
            ->where('m.movement_type', 'sale')
            ->whereIn('m.reference_type', ['appointment', 'direct'])
            ->whereIn('m.reference_id', $refs)
            ->get(['m.reference_id', 'm.quantity', 'p.name as product', 'pv.name as variant'])
            ->groupBy(fn ($r) => (string) $r->reference_id)
            ->map(fn ($items) => $items->map(fn ($r) => [
                'name' => trim($r->product . ($r->variant ? ' · ' . $r->variant : '')),
                'quantity' => abs((float) $r->quantity),
            ])->values()->all());
    }

    /** @return array<string, mixed> */
    private function appointmentVisit(object $row, Collection $appts, Collection $txByAppt, Collection $productsByRef, bool $includeInternalNotes): array
    {
        $price = fn (Appointment $a) => $a->price_override !== null ? (float) $a->price_override : (float) ($a->service?->price ?? 0);
        $inactive = fn (Appointment $a) => in_array($a->status, ['cancelled', 'no_show'], true);

        $attended = $appts->contains(fn (Appointment $a) => $a->status === 'completed' || $a->payment_status === 'paid');
        $state = $attended ? 'attended'
            : ($appts->every($inactive) ? ($appts->contains(fn (Appointment $a) => $a->status === 'no_show') ? 'no_show' : 'cancelled') : 'pending');

        $billable = $appts->reject($inactive);
        $paidCount = $billable->where('payment_status', 'paid')->count();
        $paymentStatus = $billable->isEmpty() ? 'unpaid'
            : ($paidCount === $billable->count() ? 'paid' : ($paidCount > 0 ? 'partial' : 'unpaid'));

        $txs = $appts->flatMap(fn (Appointment $a) => $txByAppt->get($a->id, collect()));
        $products = $appts->flatMap(fn (Appointment $a) => $productsByRef->get($a->id, []))->values()->all();
        $notes = $appts->pluck('service_notes')->filter()->unique()->implode("\n");
        $internal = $includeInternalNotes ? $appts->pluck('internal_notes')->filter()->unique()->implode("\n") : null;

        return [
            'id' => $row->vkey,
            'kind' => 'appointment',
            'date' => $this->iso($row->visited_at),
            'state' => $state,
            'services' => $appts->map(fn (Appointment $a) => [
                'name' => $a->service?->name ?? 'Servicio',
                'employee' => $a->employeeProfile?->full_name,
                'assistant' => $a->assistantProfile?->full_name,
                'price' => round($price($a), 2),
                'status' => $a->status,
            ])->values()->all(),
            'products' => $products,
            'amount' => round($billable->sum($price), 2),
            'payment_status' => $paymentStatus,
            'payments' => $this->payments($txs),
            'notes' => $notes !== '' ? $notes : null,
            'internal_notes' => $internal !== '' ? $internal : null,
        ];
    }

    /**
     * Cobros de la visita: los pagos mixtos salen separados por método/banco (con su moneda);
     * si no hay desglose, un renglón por transacción.
     *
     * @return array<int, array{method: string, amount: float, currency: ?string, bank: ?string}>
     */
    private function payments(Collection $txs): array
    {
        $out = [];
        foreach ($txs as $tx) {
            $splits = is_array($tx->payments_breakdown) ? $tx->payments_breakdown : [];
            $used = false;
            foreach ($splits as $split) {
                if (!is_array($split) || empty($split['method']) || !isset($split['amount'])) {
                    continue;
                }
                $used = true;
                $out[] = [
                    'method' => (string) $split['method'],
                    'amount' => round((float) $split['amount'], 2),
                    'currency' => isset($split['currency']) ? (string) $split['currency'] : null,
                    'bank' => !empty($split['bank_name']) ? (string) $split['bank_name'] : null,
                ];
            }
            if (!$used) {
                $out[] = ['method' => (string) $tx->method, 'amount' => round((float) $tx->total_amount, 2), 'currency' => null, 'bank' => null];
            }
        }

        return $out;
    }

    private function iso(mixed $value): string
    {
        return Carbon::parse((string) $value, 'UTC')->utc()->toIso8601String();
    }
}
