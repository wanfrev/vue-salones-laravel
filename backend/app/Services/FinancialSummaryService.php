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
                DB::raw("to_char(transactions.paid_at, 'YYYY-MM-DD') as bucket"),
                DB::raw('count(distinct transactions.id) as transaction_count'),
                DB::raw('coalesce(sum(transactions.total_amount), 0) as total_amount'),
                DB::raw('coalesce(sum(transactions.local_amount), 0) as local_amount'),
                DB::raw('coalesce(sum(transactions.employee_amount), 0) as employee_amount'),
                DB::raw('coalesce(sum(transactions.tip_amount), 0) as tip_amount'),
            )
            ->groupBy(DB::raw("to_char(transactions.paid_at, 'YYYY-MM-DD')"))
            ->orderBy('bucket');

        $tz = $this->resolveTimezone($businessId);

        if ($start && $end) {
            $query->whereBetween('transactions.paid_at', [$this->toUtc($start, $tz), $this->toUtc($end, $tz)]);
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
            $txQuery->whereBetween('paid_at', [$this->toUtc($start, $tz), $this->toUtc($end, $tz)]);
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
            $expQuery->whereBetween('expense_date', [$start, $end]);
        }
        if ($branchId) {
            $expQuery->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        $totalExpenses = (float) $expQuery->sum('amount');

        // Employee payments
        $empQuery = DB::table('employee_payments')
            ->where('business_id', $businessId)
            ->where('type', 'payment');

        if ($start && $end) {
            $empQuery->whereBetween('payment_date', [$start, $end]);
        }
        if ($branchId) {
            $empQuery->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        $totalEmployeePayments = (float) $empQuery->sum('amount');

        // Supplier payments
        $supQuery = DB::table('supplier_payments')
            ->where('business_id', $businessId);

        if ($start && $end) {
            $supQuery->whereBetween('payment_date', [$start, $end]);
        }
        if ($branchId) {
            $supQuery->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        $totalSupplierPayments = (float) $supQuery->sum('amount');

        $totalIncome = (float) ($txTotals->total_income ?? 0);
        $localIncome = (float) ($txTotals->local_income ?? 0);
        $employeeIncome = (float) ($txTotals->employee_income ?? 0);
        $tips = (float) ($txTotals->tips ?? 0);
        $transactionCount = (int) ($txTotals->total_transactions ?? 0);

        $netProfit = $localIncome - $totalExpenses - $totalEmployeePayments;

        return [
            'total_income' => round($totalIncome, 2),
            'local_income' => round($localIncome, 2),
            'employee_income' => round($employeeIncome, 2),
            'tips' => round($tips, 2),
            'total_expenses' => round($totalExpenses, 2),
            'total_employee_payments' => round($totalEmployeePayments, 2),
            'total_supplier_payments' => round($totalSupplierPayments, 2),
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
            ->orderByDesc('paid_at');

        $tz = $this->resolveTimezone($businessId);

        if ($start) {
            $query->where('paid_at', '>=', $this->toUtc($start, $tz));
        }
        if ($end) {
            $query->where('paid_at', '<=', $this->toUtc($end, $tz));
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
            ->leftJoin('clients', function ($join) {
                $join->on('inventory_movements.reference_id', '=', 'clients.id')
                    ->where('inventory_movements.reference_type', '=', 'direct');
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
                'clients.full_name as client_name',
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

        return $query->get()->map(function ($row) {
            $qty = abs((float) $row->quantity);
            $unitPrice = (float) $row->unit_cost;
            $total = $qty * $unitPrice;
            $rate = (float) ($row->exchange_rate_used ?? 1);

            return [
                'id' => $row->id,
                'date' => $row->created_at,
                'product' => $row->product_name ?? 'Sin producto',
                'client_name' => $row->client_name,
                'quantity' => $qty,
                'unit_price' => $unitPrice,
                'total' => round($total, 2),
                'exchange_rate_used' => $rate,
                'reference_type' => $row->reference_type,
                'is_appointment_sale' => $row->reference_type === 'appointment',
                'notes' => $row->notes,
            ];
        });
    }
}
