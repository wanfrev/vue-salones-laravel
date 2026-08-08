<?php

namespace App\Services;

use App\Models\Transaction;
use App\Models\Expense;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class FinancialSummaryService
{
    private function resolveTimezone(string $businessId): string
    {
        return \App\Models\Business::find($businessId)?->timezone ?: 'UTC';
    }

    /**
     * Convert a local date string (from the frontend) to UTC for DB queries.
     */
    private function toUtc(?string $dateStr, string $timezone): ?string
    {
        if (!$dateStr) return null;
        try {
            $len = strlen($dateStr);
            $format = $len <= 10 ? 'Y-m-d' : 'Y-m-d H:i:s';
            return \Carbon\Carbon::parse($dateStr, $timezone)
                ->setTimezone('UTC')
                ->format($format);
        } catch (\Throwable) {
            return $dateStr;
        }
    }

    /**
     * Period-bucketed transaction summary for charts.
     */
    public function summary(
        string $businessId,
        ?string $start = null,
        ?string $end = null,
        ?string $branchId = null,
    ): Collection {
        $query = DB::table('transactions')
            ->leftJoin('appointments', 'transactions.appointment_id', '=', 'appointments.id')
            ->where('transactions.business_id', $businessId)
            ->select(
                DB::raw("to_char(COALESCE(transactions.paid_at, transactions.created_at), 'YYYY-MM-DD') as bucket"),
                DB::raw('count(distinct transactions.id) as transaction_count'),
                DB::raw('coalesce(sum(transactions.total_amount), 0) as total_amount'),
                DB::raw('coalesce(sum(transactions.local_amount), 0) as local_amount'),
                DB::raw('coalesce(sum(transactions.employee_amount), 0) as employee_amount'),
                DB::raw('coalesce(sum(transactions.tip_amount), 0) as tip_amount'),
            )
            ->groupBy(DB::raw("to_char(COALESCE(transactions.paid_at, transactions.created_at), 'YYYY-MM-DD')"))
            ->orderBy('bucket');

        $tz = $this->resolveTimezone($businessId);

        if ($start && $end) {
            $query->whereBetween(DB::raw('COALESCE(transactions.paid_at, transactions.created_at)'), [$this->toUtc($start, $tz), $this->toUtc($end, $tz)]);
        }
        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('transactions.branch_id')->orWhere('transactions.branch_id', $branchId);
            });
        }

        return $query->get();
    }

    /**
     * KPI totals for the dashboard cards.
     */
    public function getKPIs(
        string $businessId,
        ?string $start = null,
        ?string $end = null,
        ?string $branchId = null,
    ): array {
        // Income from transactions
        $txQuery = DB::table('transactions')
            ->where('business_id', $businessId);

        $tz = $this->resolveTimezone($businessId);

        if ($start && $end) {
            $txQuery->whereBetween(DB::raw('COALESCE(paid_at, created_at)'), [$this->toUtc($start, $tz), $this->toUtc($end, $tz)]);
        }
        if ($branchId) {
            $txQuery->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        $txTotals = $txQuery->select(
            DB::raw('coalesce(sum(total_amount), 0) as total_income'),
            DB::raw('coalesce(sum(local_amount), 0) as local_income'),
            DB::raw('coalesce(sum(employee_amount), 0) as employee_income'),
            DB::raw('coalesce(sum(tip_amount), 0) as tips'),
            DB::raw('count(distinct id) as total_transactions'),
        )->first();

        // Expenses
        $expQuery = DB::table('expenses')
            ->where('business_id', $businessId);

        if ($start && $end) {
            $expQuery->whereBetween('expense_date', [$this->toUtc($start, $tz), $this->toUtc($end, $tz)]);
        }
        if ($branchId) {
            $expQuery->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        $operationalExpenses = (float) $expQuery->sum('amount');

        // Employee payments & consumptions
        $empQuery = DB::table('employee_payments')
            ->where('business_id', $businessId);

        if ($start && $end) {
            $empQuery->whereBetween('payment_date', [$this->toUtc($start, $tz), $this->toUtc($end, $tz)]);
        }
        if ($branchId) {
            $empQuery->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        $empTotals = $empQuery->select(
            DB::raw("COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END), 0) as total_payment"),
            DB::raw("COALESCE(SUM(CASE WHEN type = 'consumption' THEN amount ELSE 0 END), 0) as total_consumption")
        )->first();

        $totalEmployeePayments = (float) ($empTotals->total_payment ?? 0);
        $totalConsumptions = (float) ($empTotals->total_consumption ?? 0);

        // Supplier payments
        $supQuery = DB::table('supplier_payments')
            ->where('business_id', $businessId);

        if ($start && $end) {
            $supQuery->whereBetween('payment_date', [$this->toUtc($start, $tz), $this->toUtc($end, $tz)]);
        }
        if ($branchId) {
            $supQuery->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        $totalSupplierPayments = (float) $supQuery->sum('amount');

        $totalExpenses = $operationalExpenses + $totalEmployeePayments + $totalSupplierPayments;

        $totalIncome = (float) ($txTotals->total_income ?? 0);
        $localIncome = (float) ($txTotals->local_income ?? 0);
        $employeeIncome = (float) ($txTotals->employee_income ?? 0);
        $tips = (float) ($txTotals->tips ?? 0);
        $transactionCount = (int) ($txTotals->total_transactions ?? 0);

        $employeeCommissions = round($totalIncome - $localIncome, 2);

        // Cost of Goods Sold (COGS): sólo movimientos de venta/consumo real de producto.
        // Los ajustes manuales de stock (mermas, correcciones de conteo) no son ventas
        // y no deben contarse como costo de venta.
        $cogsQuery = DB::table('inventory_movements')
            ->leftJoin('products', 'inventory_movements.product_id', '=', 'products.id')
            ->leftJoin('product_variants', 'inventory_movements.variant_id', '=', 'product_variants.id')
            ->where('inventory_movements.business_id', $businessId)
            ->where('inventory_movements.quantity', '<', 0)
            ->whereIn('inventory_movements.movement_type', ['sale', 'consumption']);

        if ($start && $end) {
            $cogsQuery->whereBetween('inventory_movements.created_at', [$this->toUtc($start, $tz), $this->toUtc($end, $tz)]);
        }
        if ($branchId) {
            $cogsQuery->where(function ($q) use ($branchId) {
                $q->whereNull('inventory_movements.branch_id')->orWhere('inventory_movements.branch_id', $branchId);
            });
        }

        $totalCogs = (float) $cogsQuery->selectRaw(
            'COALESCE(SUM(ABS(inventory_movements.quantity) * COALESCE(NULLIF(inventory_movements.unit_cost, 0), product_variants.unit_cost, products.unit_cost, 0)), 0) as total'
        )->value('total');

        // Ganancia = ingresos - (nomina + consumos + gastos operativos + abono a proveedores)
        $profit = $totalIncome - ($totalExpenses + $totalConsumptions);
        // Ganancia Neta = Ganancia - costo de los productos vendidos
        $netProfit = $profit - $totalCogs;

        return [
            'total_income' => round($totalIncome, 2),
            'local_income' => round($localIncome, 2),
            'employee_income' => round($employeeIncome, 2),
            'employee_commissions' => $employeeCommissions,
            'tips' => round($tips, 2),
            'operational_expenses' => round($operationalExpenses, 2),
            'total_expenses' => round($totalExpenses, 2),
            'total_employee_payments' => round($totalEmployeePayments, 2),
            'total_supplier_payments' => round($totalSupplierPayments, 2),
            'total_consumptions' => round($totalConsumptions, 2),
            'total_cogs' => round($totalCogs, 2),
            'profit' => round($profit, 2),
            'net_profit' => round($netProfit, 2),
            'total_transactions' => $transactionCount,
        ];
    }

    /**
     * Transaction list with appointment details for "Cobros de Citas".
     */
    public function getTransactionsWithDetails(
        string $businessId,
        ?string $start = null,
        ?string $end = null,
        ?string $branchId = null,
    ): Collection {
        $query = Transaction::with([
            'appointment' => function ($q) {
                $q->with(['client', 'service', 'employeeProfile', 'assistantProfile']);
            },
        ])
            ->where('business_id', $businessId)
            ->orderByRaw('COALESCE(paid_at, created_at) DESC');

        $tz = $this->resolveTimezone($businessId);

        if ($start) {
            $query->where(DB::raw('COALESCE(paid_at, created_at)'), '>=', $this->toUtc($start, $tz));
        }
        if ($end) {
            $query->where(DB::raw('COALESCE(paid_at, created_at)'), '<=', $this->toUtc($end, $tz));
        }
        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        return $query->get()->map(function (Transaction $tx) {
            $appt = $tx->appointment;
            return [
                'id' => $tx->id,
                'appointment_id' => $tx->appointment_id,
                'group_id' => $appt?->group_id,
                'paid_at' => is_string($tx->paid_at) ? $tx->paid_at : $tx->paid_at?->toISOString(),
                'total_amount' => $tx->total_amount,
                'local_amount' => $tx->local_amount,
                'employee_amount' => $tx->employee_amount,
                'assistant_amount' => $tx->assistant_amount,
                'employee_percentage' => $tx->employee_percentage,
                'assistant_percentage' => $tx->assistant_percentage,
                'tip_amount' => $tx->tip_amount,
                'method' => $tx->method,
                'exchange_rate_used' => $tx->exchange_rate_used,
                'payments_breakdown' => $tx->payments_breakdown,
                'notes' => $tx->notes,
                'client_name' => $appt?->client?->full_name,
                'employee_name' => $appt?->employeeProfile?->full_name,
                'assistant_name' => $appt?->assistantProfile?->full_name,
                'service_name' => $appt?->service?->name,
                'service_price' => $appt?->service?->price,
                'employee_pay_type' => $appt?->employeeProfile?->pay_type,
                'employee_pay_percentage' => $appt?->employeeProfile?->pay_percentage,
                'is_direct_sale' => $tx->appointment_id === null,
            ];
        });
    }

    /**
     * Product sales from inventory movements.
     */
    public function getProductSales(
        string $businessId,
        ?string $start = null,
        ?string $end = null,
        ?string $branchId = null,
    ): Collection {
        $query = DB::table('inventory_movements')
            ->leftJoin('products', 'inventory_movements.product_id', '=', 'products.id')
            ->leftJoin('clients', 'inventory_movements.client_id', '=', 'clients.id')
            ->leftJoin('transactions', function ($join) {
                $join->where(function ($q) {
                    $q->where(function ($sq) {
                        $sq->on('inventory_movements.reference_id', '=', 'transactions.id')
                           ->where('inventory_movements.reference_type', '=', 'direct');
                    })->orWhere(function ($sq) {
                        $sq->on('inventory_movements.reference_id', '=', 'transactions.appointment_id')
                           ->where('inventory_movements.reference_type', '=', 'appointment');
                    });
                });
            })
            ->leftJoin('appointments', function ($join) {
                $join->on('inventory_movements.reference_id', '=', 'appointments.id')
                     ->where('inventory_movements.reference_type', '=', 'appointment');
            })
            ->leftJoin('clients as appt_clients', 'appointments.client_id', '=', 'appt_clients.id')
            ->leftJoin('profiles as appt_employees', 'appointments.employee_id', '=', 'appt_employees.id')
            ->leftJoin('profiles as creator_profiles', function ($join) {
                $join->on(DB::raw("COALESCE(inventory_movements.created_by, transactions.created_by)"), '=', 'creator_profiles.id');
            })
            ->leftJoin('users as creator_users', function ($join) {
                $join->on(DB::raw("COALESCE(inventory_movements.created_by, transactions.created_by)"), '=', 'creator_users.id');
            })
            ->where('inventory_movements.business_id', $businessId)
            ->where('inventory_movements.movement_type', 'sale')
            ->select(
                'inventory_movements.id',
                'inventory_movements.created_at',
                'inventory_movements.quantity',
                'inventory_movements.unit_cost',
                'inventory_movements.reference_type',
                'inventory_movements.reference_id',
                'inventory_movements.exchange_rate_used',
                'inventory_movements.notes',
                'products.name as product_name',
                'products.unit_price as product_unit_price',
                DB::raw("COALESCE(clients.full_name, appt_clients.full_name) as client_name"),
                DB::raw("COALESCE(appt_employees.full_name, creator_profiles.full_name, creator_users.name) as employee_name"),
                'transactions.method as payment_method',
                'transactions.payments_breakdown',
                'transactions.total_amount as transaction_total_amount',
            )
            ->orderByDesc('inventory_movements.created_at');

        $tz = $this->resolveTimezone($businessId);

        if ($start && $end) {
            $query->whereBetween('inventory_movements.created_at', [$this->toUtc($start, $tz), $this->toUtc($end, $tz)]);
        }
        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('inventory_movements.branch_id')
                    ->orWhere('inventory_movements.branch_id', $branchId);
            });
        }

        $rows = $query->get();

        // A direct sale's "Total a Cobrar" can be overridden in POS independently of the
        // cart's line prices (client/src/views/POS.vue's customTotalAmount). Left as
        // qty * today's catalog price, this report would show what the cart would have cost
        // at today's prices — not what was actually charged. Rescale each direct sale's line
        // totals so they sum to transactions.total_amount, the amount actually collected.
        // Appointment-attached product sales don't have this override, so they're untouched.
        $directSaleScale = $rows
            ->where('reference_type', 'direct')
            ->groupBy('reference_id')
            ->map(function ($group) {
                $natural = $group->sum(fn ($row) => abs((float) $row->quantity) * (float) ($row->product_unit_price ?? $row->unit_cost));
                $charged = (float) ($group->first()->transaction_total_amount ?? 0);
                // Falls back to no rescaling (1.0) whenever either side is unusable, so a
                // data gap can only leave this report as it was, never zero it out.
                return ($natural > 0.0001 && $charged > 0) ? $charged / $natural : 1.0;
            });

        return $rows->map(function ($row) use ($directSaleScale) {
            $qty = abs((float) $row->quantity);
            $unitPrice = (float) ($row->product_unit_price ?? $row->unit_cost);
            $scale = $row->reference_type === 'direct' ? ($directSaleScale[$row->reference_id] ?? 1.0) : 1.0;
            // Scale unit_price too, not just total — the UI shows both in the same row
            // (Precio × Cant. next to Total), so qty * unit_price must still equal total.
            $effectiveUnitPrice = $unitPrice * $scale;
            $total = $qty * $effectiveUnitPrice;
            $rate = (float) ($row->exchange_rate_used ?? 1);

            return [
                'id' => $row->id,
                'date' => $row->created_at,
                'product' => $row->product_name ?? 'Sin producto',
                'client_name' => $row->client_name,
                'employee_name' => $row->employee_name,
                'quantity' => $qty,
                'unit_price' => round($effectiveUnitPrice, 2),
                'total' => round($total, 2),
                'exchange_rate_used' => $rate,
                'reference_type' => $row->reference_type,
                'reference_id' => $row->reference_id,
                'is_appointment_sale' => $row->reference_type === 'appointment',
                'notes' => $row->notes,
                'payment_method' => $row->payment_method ?? 'cash',
                'payments_breakdown' => $row->payments_breakdown ? json_decode($row->payments_breakdown, true) : null,
            ];
        });
    }
}
