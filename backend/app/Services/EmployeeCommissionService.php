<?php

namespace App\Services;

use App\Models\Profile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class EmployeeCommissionService
{
    public function getBreakdown(string $businessId, ?string $startDate = null, ?string $endDate = null, ?string $branchId = null): Collection
    {
        $startDate = $startDate ?? now()->startOfMonth()->toDateString();
        $endDate = $endDate ?? now()->toDateString();

        $query = DB::table('transactions')
            ->join('appointments', 'transactions.appointment_id', '=', 'appointments.id')
            ->join('profiles as emp', 'appointments.employee_id', '=', 'emp.id')
            ->join('services', 'appointments.service_id', '=', 'services.id')
            ->leftJoin('clients', 'appointments.client_id', '=', 'clients.id')
            ->where('transactions.business_id', $businessId)
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

        $assistantQuery = DB::table('transactions')
            ->join('appointments', 'transactions.appointment_id', '=', 'appointments.id')
            ->join('profiles as emp', 'appointments.assistant_employee_id', '=', 'emp.id')
            ->join('services', 'appointments.service_id', '=', 'services.id')
            ->leftJoin('clients', 'appointments.client_id', '=', 'clients.id')
            ->where('transactions.business_id', $businessId)
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

        return $rows->concat($assistantRows)->sortByDesc('created_at')->values();
    }

    public function getEmployeeBalance(string $employeeId, string $businessId, ?string $yearMonth = null): array
    {
        $profile = Profile::find($employeeId);
        if (!$profile || $profile->business_id !== $businessId) {
            throw new NotFoundHttpException('Empleado no encontrado.');
        }

        $yearMonth = $yearMonth ?? now()->format('Y-m');
        $startDate = $yearMonth . '-01';
        $endDate = (new \DateTime($startDate))->modify('last day of this month')->format('Y-m-d');

        $totalEarned = DB::table('transactions')
            ->join('appointments', 'transactions.appointment_id', '=', 'appointments.id')
            ->where('appointments.employee_id', $employeeId)
            ->where('transactions.business_id', $businessId)
            ->whereBetween('transactions.paid_at', [$startDate, $endDate . ' 23:59:59'])
            ->sum('transactions.employee_amount');

        $assistantEarned = DB::table('transactions')
            ->join('appointments', 'transactions.appointment_id', '=', 'appointments.id')
            ->where('appointments.assistant_employee_id', $employeeId)
            ->where('transactions.business_id', $businessId)
            ->whereBetween('transactions.paid_at', [$startDate, $endDate . ' 23:59:59'])
            ->sum('transactions.assistant_amount');

        $tipsEarned = DB::table('transactions')
            ->join('appointments', 'transactions.appointment_id', '=', 'appointments.id')
            ->where('appointments.employee_id', $employeeId)
            ->where('transactions.business_id', $businessId)
            ->whereBetween('transactions.paid_at', [$startDate, $endDate . ' 23:59:59'])
            ->sum('transactions.tip_amount');

        $totalEarned = floatval($totalEarned) + floatval($assistantEarned) + floatval($tipsEarned);

        $totalPaid = DB::table('employee_payments')
            ->where('employee_id', $employeeId)
            ->where('business_id', $businessId)
            ->where('type', 'payment')
            ->whereBetween('payment_date', [$startDate, $endDate])
            ->sum('amount');

        $totalConsumed = DB::table('employee_payments')
            ->where('employee_id', $employeeId)
            ->where('business_id', $businessId)
            ->where('type', 'consumption')
            ->whereBetween('payment_date', [$startDate, $endDate])
            ->sum('amount');

        $baseSalary = floatval($profile->base_salary ?? 0);
        $totalEarned += $baseSalary;

        return [
            'employee_id' => $employeeId,
            'employee_name' => $profile->full_name,
            'pay_type' => $profile->pay_type,
            'pay_percentage' => floatval($profile->pay_percentage ?? 0),
            'base_salary' => $baseSalary,
            'total_earned' => round($totalEarned, 2),
            'total_paid' => round(floatval($totalPaid), 2),
            'total_consumed' => round(floatval($totalConsumed), 2),
            'pending_balance' => round($totalEarned - floatval($totalPaid) - floatval($totalConsumed), 2),
            'year_month' => $yearMonth,
        ];
    }
}
