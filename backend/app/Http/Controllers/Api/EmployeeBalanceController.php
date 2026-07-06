<?php

namespace App\Http\Controllers\Api;

use App\Models\Profile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EmployeeBalanceController
{
    /**
     * GET /api/employee-balance/{employeeId}
     * Returns: earned (comisiones), paid, consumed, pending balance.
     */
    public function show(Request $request, string $employeeId): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $profile = Profile::find($employeeId);
        if (!$profile || $profile->business_id !== $p?->business_id) {
            return response()->json(['error' => ['message' => 'Not found']], 404);
        }

        $yearMonth = $request->get('year_month', now()->format('Y-m'));
        $startDate = $yearMonth . '-01';
        $endDate = (new \DateTime($startDate))->modify('last day of this month')->format('Y-m-d');

        // Total earned from transactions (comisiones del mes)
        $totalEarned = DB::table('transactions')
            ->join('appointments', 'transactions.appointment_id', '=', 'appointments.id')
            ->where('appointments.employee_id', $employeeId)
            ->where('transactions.business_id', $p->business_id)
            ->whereBetween('transactions.paid_at', [$startDate, $endDate . ' 23:59:59'])
            ->sum('transactions.employee_amount');

        // Also include assistant earnings
        $assistantEarned = DB::table('transactions')
            ->join('appointments', 'transactions.appointment_id', '=', 'appointments.id')
            ->where('appointments.assistant_employee_id', $employeeId)
            ->where('transactions.business_id', $p->business_id)
            ->whereBetween('transactions.paid_at', [$startDate, $endDate . ' 23:59:59'])
            ->sum('transactions.assistant_amount');

        // Total tips earned
        $tipsEarned = DB::table('transactions')
            ->join('appointments', 'transactions.appointment_id', '=', 'appointments.id')
            ->where('appointments.employee_id', $employeeId)
            ->where('transactions.business_id', $p->business_id)
            ->whereBetween('transactions.paid_at', [$startDate, $endDate . ' 23:59:59'])
            ->sum('transactions.tip_amount');

        $totalEarned = floatval($totalEarned) + floatval($assistantEarned) + floatval($tipsEarned);

        // Total paid (nómina)
        $totalPaid = DB::table('employee_payments')
            ->where('employee_id', $employeeId)
            ->where('business_id', $p->business_id)
            ->where('type', 'payment')
            ->whereBetween('payment_date', [$startDate, $endDate])
            ->sum('amount');

        // Total consumed (debitado)
        $totalConsumed = DB::table('employee_payments')
            ->where('employee_id', $employeeId)
            ->where('business_id', $p->business_id)
            ->where('type', 'consumption')
            ->whereBetween('payment_date', [$startDate, $endDate])
            ->sum('amount');

        // Base salary (prorated if pay_type is salary or mixed)
        $baseSalary = floatval($profile->base_salary ?? 0);
        $totalEarned += $baseSalary;

        $pending = $totalEarned - floatval($totalPaid) - floatval($totalConsumed);

        return response()->json([
            'employee_id' => $employeeId,
            'employee_name' => $profile->full_name,
            'pay_type' => $profile->pay_type,
            'pay_percentage' => floatval($profile->pay_percentage ?? 0),
            'base_salary' => $baseSalary,
            'total_earned' => round($totalEarned, 2),
            'total_paid' => round(floatval($totalPaid), 2),
            'total_consumed' => round(floatval($totalConsumed), 2),
            'pending_balance' => round($pending, 2),
            'year_month' => $yearMonth,
        ]);
    }
}
