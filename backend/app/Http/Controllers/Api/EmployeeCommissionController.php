<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EmployeeCommissionController
{
    /**
     * GET /api/employee-commissions
     * Returns flat commission rows per employee/service/transaction.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        $startDate = $request->get('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', now()->toDateString());
        $branchId = $request->get('branch_id');

        $query = DB::table('transactions')
            ->join('appointments', 'transactions.appointment_id', '=', 'appointments.id')
            ->join('profiles as emp', 'appointments.employee_id', '=', 'emp.id')
            ->join('services', 'appointments.service_id', '=', 'services.id')
            ->leftJoin('clients', 'appointments.client_id', '=', 'clients.id')
            ->where('transactions.business_id', $p->business_id)
            ->whereBetween('transactions.created_at', [
                $startDate . ' 00:00:00',
                $endDate . ' 23:59:59',
            ])
            ->select(
                'transactions.id',
                'transactions.total_amount as amount',
                'transactions.employee_percentage as percentage',
                'transactions.employee_amount as earnings',
                'transactions.tip_amount as tip_amount',
                'transactions.method',
                'transactions.exchange_rate_used',
                'transactions.payments_breakdown',
                'transactions.paid_at as created_at',
                'appointments.employee_id',
                'appointments.assistant_employee_id',
                'appointments.assistant_percentage',
                'appointments.employee_percentage_override',
                'appointments.group_id',
                'emp.full_name as employee_name',
                'emp.pay_type',
                'emp.pay_percentage',
                'emp.base_salary',
                'services.name as service_name',
                'services.id as service_id',
                'clients.full_name as client_name',
                'clients.id as client_id',
            )
            ->orderByDesc('transactions.created_at');

        if ($branchId) {
            $query->where('transactions.branch_id', $branchId);
        }

        $rows = $query->get();

        // Also fetch assistant transactions
        $assistantQuery = DB::table('transactions')
            ->join('appointments', 'transactions.appointment_id', '=', 'appointments.id')
            ->join('profiles as emp', 'appointments.assistant_employee_id', '=', 'emp.id')
            ->join('services', 'appointments.service_id', '=', 'services.id')
            ->leftJoin('clients', 'appointments.client_id', '=', 'clients.id')
            ->where('transactions.business_id', $p->business_id)
            ->whereNotNull('appointments.assistant_employee_id')
            ->where('appointments.assistant_percentage', '>', 0)
            ->whereBetween('transactions.created_at', [
                $startDate . ' 00:00:00',
                $endDate . ' 23:59:59',
            ])
            ->select(
                'transactions.id',
                'transactions.total_amount as amount',
                'transactions.assistant_percentage as percentage',
                'transactions.assistant_amount as earnings',
                DB::raw('0 as tip_amount'),
                'transactions.method',
                'transactions.exchange_rate_used',
                'transactions.payments_breakdown',
                'transactions.paid_at as created_at',
                'appointments.assistant_employee_id as employee_id',
                DB::raw('null as assistant_employee_id'),
                DB::raw('null as assistant_percentage'),
                DB::raw('null as employee_percentage_override'),
                'appointments.group_id',
                'emp.full_name as employee_name',
                'emp.pay_type',
                'emp.pay_percentage',
                'emp.base_salary',
                'services.name as service_name',
                'services.id as service_id',
                'clients.full_name as client_name',
                'clients.id as client_id',
            )
            ->orderByDesc('transactions.created_at');

        if ($branchId) {
            $assistantQuery->where('transactions.branch_id', $branchId);
        }

        $assistantRows = $assistantQuery->get();

        $allRows = $rows->concat($assistantRows)->sortByDesc('created_at')->values();

        return response()->json($allRows);
    }
}
