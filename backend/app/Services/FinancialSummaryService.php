<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class FinancialSummaryService
{
    public function summary(
        string $businessId,
        ?string $start = null,
        ?string $end = null,
        ?string $branchId = null,
        ?string $employeeId = null,
    ): Collection {
        $query = DB::table('transactions')
            ->join('appointments', 'transactions.appointment_id', '=', 'appointments.id')
            ->where('transactions.business_id', $businessId)
            ->select(
                DB::raw("to_char(transactions.paid_at, 'YYYY-MM-DD') as bucket"),
                DB::raw('count(distinct transactions.appointment_id) as appointments'),
                DB::raw('coalesce(sum(transactions.total_amount), 0) as total_amount'),
                DB::raw('coalesce(sum(transactions.local_amount), 0) as local_amount'),
                DB::raw('coalesce(sum(transactions.employee_amount), 0) as employee_amount'),
                DB::raw('coalesce(sum(transactions.assistant_amount), 0) as assistant_amount'),
                DB::raw('coalesce(sum(transactions.tip_amount), 0) as tip_amount'),
            )
            ->groupBy(DB::raw("to_char(transactions.paid_at, 'YYYY-MM-DD')"))
            ->orderBy('bucket');

        if ($start && $end) {
            $query->whereBetween('transactions.paid_at', [$start . ' 00:00:00', $end . ' 23:59:59']);
        }
        if ($branchId) $query->where('transactions.branch_id', $branchId);
        if ($employeeId) $query->where('appointments.employee_id', $employeeId);

        return $query->get();
    }

    public function getKPIs(
        string $businessId,
        ?string $start = null,
        ?string $end = null,
        ?string $branchId = null,
        ?string $employeeId = null,
    ): array {
        $transactionsQuery = DB::table('transactions')
            ->join('appointments', 'transactions.appointment_id', '=', 'appointments.id')
            ->where('transactions.business_id', $businessId);

        if ($start && $end) {
            $transactionsQuery->whereBetween('transactions.paid_at', [$start . ' 00:00:00', $end . ' 23:59:59']);
        }

        if ($branchId) $transactionsQuery->where('transactions.branch_id', $branchId);
        if ($employeeId) $transactionsQuery->where('appointments.employee_id', $employeeId);

        $txTotals = $transactionsQuery->select(
            DB::raw('coalesce(sum(transactions.total_amount), 0) as total_income'),
            DB::raw('coalesce(sum(transactions.local_amount), 0) as local_income'),
            DB::raw('coalesce(sum(transactions.employee_amount), 0) as employee_income'),
            DB::raw('coalesce(sum(transactions.assistant_amount), 0) as assistant_income'),
            DB::raw('coalesce(sum(transactions.tip_amount), 0) as tips'),
            DB::raw('count(distinct transactions.appointment_id) as total_appointments'),
            DB::raw('count(distinct transactions.id) as total_transactions'),
        )->first();

        $expensesQuery = DB::table('expenses')
            ->where('business_id', $businessId)
            ->whereBetween('expense_date', [$start, $end]);

        if ($branchId) $expensesQuery->where('branch_id', $branchId);

        $totalExpenses = $expensesQuery->sum('amount');

        $employeePaymentsQuery = DB::table('employee_payments')
            ->where('business_id', $businessId)
            ->where('type', 'payment')
            ->whereBetween('payment_date', [$start, $end]);

        if ($branchId) $employeePaymentsQuery->where('branch_id', $branchId);
        if ($employeeId) $employeePaymentsQuery->where('employee_id', $employeeId);

        $totalEmployeePayments = $employeePaymentsQuery->sum('amount');

        $productSalesQuery = DB::table('inventory_movements')
            ->where('business_id', $businessId)
            ->where('movement_type', 'sale')
            ->whereBetween('created_at', [$start . ' 00:00:00', $end . ' 23:59:59']);

        if ($branchId) $productSalesQuery->where('branch_id', $branchId);

        $productSales = $productSalesQuery->select(
            DB::raw('coalesce(sum(abs(quantity) * unit_cost), 0) as cost'),
            DB::raw('count(*) as sales_count'),
        )->first();

        $totalIncome = floatval($txTotals->total_income ?? 0);
        $localIncome = floatval($txTotals->local_income ?? 0);
        $employeeIncome = floatval($txTotals->employee_income ?? 0);
        $assistantIncome = floatval($txTotals->assistant_income ?? 0);
        $tips = floatval($txTotals->tips ?? 0);
        $totalExpenses = floatval($totalExpenses);
        $totalEmployeePayments = floatval($totalEmployeePayments);
        $productSalesCost = floatval($productSales->cost ?? 0);

        $netProfit = $localIncome - $totalExpenses - $totalEmployeePayments + $productSalesCost;

        return [
            'total_income' => round($totalIncome, 2),
            'local_income' => round($localIncome, 2),
            'employee_income' => round($employeeIncome, 2),
            'assistant_income' => round($assistantIncome, 2),
            'tips' => round($tips, 2),
            'total_expenses' => round($totalExpenses, 2),
            'total_employee_payments' => round($totalEmployeePayments, 2),
            'product_sales_cost' => round($productSalesCost, 2),
            'net_profit' => round($netProfit, 2),
            'total_appointments' => (int) ($txTotals->total_appointments ?? 0),
            'total_transactions' => (int) ($txTotals->total_transactions ?? 0),
            'product_sales_count' => (int) ($productSales->sales_count ?? 0),
        ];
    }

    public function getTransactionsUnified(
        string $businessId,
        ?string $start = null,
        ?string $end = null,
        ?string $branchId = null,
        ?string $employeeId = null,
    ): Collection {
        $query = \App\Models\Transaction::with([
            'appointment' => function ($q) {
                $q->with(['client', 'service', 'employeeProfile', 'assistantProfile']);
            },
        ])
        ->where('business_id', $businessId)
        ->orderByDesc('created_at');

        if ($start) $query->where('paid_at', '>=', $start);
        if ($end) $query->where('paid_at', '<=', $end);
        if ($branchId) $query->where('branch_id', $branchId);
        if ($employeeId) {
            $query->whereHas('appointment', fn($q) => $q->where('employee_id', $employeeId));
        }

        return $query->get()->map(function ($tx) {
            $appt = $tx->appointment;
            return collect([
                'id' => $tx->id,
                'appointment_id' => $tx->appointment_id,
                'paid_at' => $tx->paid_at,
                'created_at' => $tx->created_at,
                'total_amount' => $tx->total_amount,
                'method' => $tx->method,
                'employee_percentage' => $tx->employee_percentage,
                'assistant_amount' => $tx->assistant_amount,
                'assistant_percentage' => $tx->assistant_percentage,
                'exchange_rate_used' => $tx->exchange_rate_used,
                'payments_breakdown' => $tx->payments_breakdown,
                'notes' => $tx->notes,
                'tip_amount' => $tx->tip_amount,
                'appointments' => $appt ? [
                    'client_id' => $appt->client_id,
                    'service_id' => $appt->service_id,
                    'employee_id' => $appt->employee_id,
                    'assistant_employee_id' => $appt->assistant_employee_id,
                    'assistant_percentage' => $appt->assistant_percentage,
                    'employee_percentage_override' => $appt->employee_percentage_override,
                    'group_id' => $appt->group_id,
                    'clients' => $appt->client ? ['full_name' => $appt->client->full_name] : null,
                    'services' => $appt->service ? ['name' => $appt->service->name] : null,
                    'employee_profile' => $appt->employeeProfile ? [
                        'full_name' => $appt->employeeProfile->full_name,
                        'pay_type' => $appt->employeeProfile->pay_type,
                        'pay_percentage' => $appt->employeeProfile->pay_percentage,
                        'base_salary' => $appt->employeeProfile->base_salary,
                    ] : null,
                    'assistant_profile' => $appt->assistantProfile ? [
                        'full_name' => $appt->assistantProfile->full_name,
                        'pay_type' => $appt->assistantProfile->pay_type,
                        'pay_percentage' => $appt->assistantProfile->pay_percentage,
                        'base_salary' => $appt->assistantProfile->base_salary,
                    ] : null,
                ] : null,
            ]);
        });
    }
}
