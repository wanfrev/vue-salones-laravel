<?php

namespace App\Services;

use App\Models\Profile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class EmployeeCommissionService
{
    /**
     * Normalize a date string to ensure the full day is included.
     * If endDate is date-only (length 10, no time), append 23:59:59.
     */
    private function normalizeEndDate(?string $endDate): ?string
    {
        if ($endDate && strlen($endDate) === 10) {
            return $endDate . ' 23:59:59';
        }
        return $endDate;
    }

    /**
     * Service-level commission details for all employees in a period.
     */
    public function getCommissions(
        string $businessId,
        ?string $branchId = null,
        ?string $startDate = null,
        ?string $endDate = null,
    ): Collection {
        $query = DB::table('transactions')
            ->join('appointments', 'transactions.appointment_id', '=', 'appointments.id')
            ->join('profiles', 'appointments.employee_id', '=', 'profiles.id')
            ->leftJoin('services', 'appointments.service_id', '=', 'services.id')
            ->leftJoin('clients', 'appointments.client_id', '=', 'clients.id')
            ->where('transactions.business_id', $businessId)
            ->whereIn('appointments.status', ['confirmed', 'completed', 'pending'])
            ->select(
                'profiles.full_name as employee_name',
                'profiles.pay_type',
                'profiles.pay_percentage',
                'profiles.base_salary',
                'services.name as service_name',
                'clients.full_name as client_name',
                'transactions.total_amount',
                'transactions.employee_amount',
                'transactions.employee_percentage',
                'transactions.tip_amount',
                'transactions.exchange_rate_used',
                'transactions.paid_at',
            )
            ->orderByDesc('transactions.paid_at');

        if ($startDate && $endDate) {
            $query->whereBetween('transactions.paid_at', [$startDate, $this->normalizeEndDate($endDate)]);
        }
        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('transactions.branch_id')->orWhere('transactions.branch_id', $branchId);
            });
        }

        return $query->get()->map(fn($row) => [
            'employee_name' => $row->employee_name,
            'pay_type' => $row->pay_type,
            'pay_percentage' => (float) ($row->pay_percentage ?? 0),
            'service_name' => $row->service_name ?? '—',
            'client_name' => $row->client_name ?? '—',
            'total_amount' => (float) $row->total_amount,
            'employee_amount' => (float) $row->employee_amount,
            'employee_percentage' => (float) ($row->employee_percentage ?? 0),
            'tip_amount' => (float) ($row->tip_amount ?? 0),
            'exchange_rate_used' => (float) ($row->exchange_rate_used ?? 1),
            'paid_at' => $row->paid_at,
        ]);
    }

    /**
     * Per-employee debt summary.
     * Returns: total owed, total paid, pending per employee.
     */
    public function getEmployeeDebt(
        string $businessId,
        ?string $branchId = null,
        ?string $startDate = null,
        ?string $endDate = null,
    ): Collection {
        // Total commission earned per employee
        $earningsQuery = DB::table('transactions')
            ->join('appointments', 'transactions.appointment_id', '=', 'appointments.id')
            ->join('profiles', 'appointments.employee_id', '=', 'profiles.id')
            ->where('transactions.business_id', $businessId)
            ->whereIn('appointments.status', ['confirmed', 'completed', 'pending'])
            ->select(
                'profiles.id as employee_id',
                'profiles.full_name as employee_name',
                'profiles.pay_type',
                'profiles.pay_percentage',
                'profiles.base_salary',
                DB::raw('COALESCE(SUM(transactions.employee_amount), 0) as commission'),
                DB::raw('COALESCE(SUM(transactions.tip_amount), 0) as tips'),
            )
            ->groupBy('profiles.id', 'profiles.full_name', 'profiles.pay_type', 'profiles.pay_percentage', 'profiles.base_salary');

        if ($startDate && $endDate) {
            $earningsQuery->whereBetween('transactions.paid_at', [$startDate, $this->normalizeEndDate($endDate)]);
        }
        if ($branchId) {
            $earningsQuery->where(function ($q) use ($branchId) {
                $q->whereNull('transactions.branch_id')->orWhere('transactions.branch_id', $branchId);
            });
        }

        $earnings = $earningsQuery->get()->keyBy('employee_id');

        // Total paid per employee
        $paidQuery = DB::table('employee_payments')
            ->where('business_id', $businessId)
            ->select(
                'employee_id',
                DB::raw("COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END), 0) as paid"),
                DB::raw("COALESCE(SUM(CASE WHEN type = 'consumption' THEN amount ELSE 0 END), 0) as consumed"),
            )
            ->groupBy('employee_id');

        if ($startDate && $endDate) {
            $paidQuery->whereBetween('payment_date', [$startDate, $this->normalizeEndDate($endDate)]);
        }
        if ($branchId) {
            $paidQuery->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        $paid = $paidQuery->get()->keyBy('employee_id');

        return $earnings->map(function ($row) use ($paid) {
            $p = $paid->get($row->employee_id);
            $totalPaid = (float) ($p->paid ?? 0);
            $totalConsumed = (float) ($p->consumed ?? 0);
            $commission = (float) $row->commission;
            $tips = (float) $row->tips;
            $base = (float) ($row->base_salary ?? 0);
            $totalEarned = $commission + $tips + $base;
            $pending = $totalEarned - $totalPaid + $totalConsumed;

            return [
                'employee_id' => $row->employee_id,
                'employee_name' => $row->employee_name,
                'pay_type' => $row->pay_type,
                'pay_percentage' => (float) ($row->pay_percentage ?? 0),
                'base_salary' => (float) ($row->base_salary ?? 0),
                'commission' => round($commission, 2),
                'tips' => round($tips, 2),
                'total' => round($totalEarned, 2),
                'paid' => round($totalPaid, 2),
                'consumed' => round($totalConsumed, 2),
                'pending' => round($pending, 2),
            ];
        })->values();
    }

    /**
     * Get employee balance for a specific employee + date range.
     */
    public function getEmployeeBalance(
        string $businessId,
        string $employeeId,
        ?string $startDate = null,
        ?string $endDate = null,
    ): array {
        // Earned
        $earned = DB::table('transactions')
            ->join('appointments', 'transactions.appointment_id', '=', 'appointments.id')
            ->where('transactions.business_id', $businessId)
            ->where('appointments.employee_id', $employeeId)
            ->whereIn('appointments.status', ['confirmed', 'completed', 'pending'])
            ->when($startDate && $endDate, fn($q) => $q->whereBetween('transactions.paid_at', [$startDate, $this->normalizeEndDate($endDate)]))
            ->select(
                DB::raw('COALESCE(SUM(transactions.employee_amount), 0) as commission'),
                DB::raw('COALESCE(SUM(transactions.tip_amount), 0) as tips'),
            )
            ->first();

        $commission = (float) ($earned->commission ?? 0);
        $tips = (float) ($earned->tips ?? 0);

        $profile = Profile::find($employeeId);
        $baseSalary = $profile ? (float) ($profile->base_salary ?? 0) : 0;
        $payType = $profile ? ($profile->pay_type ?? null) : null;
        $payPercentage = $profile ? (float) ($profile->pay_percentage ?? 0) : 0;
        $employeeVesRate = $profile ? (float) ($profile->employee_ves_rate ?? 0) : 0;

        // Paid
        $paid = DB::table('employee_payments')
            ->where('business_id', $businessId)
            ->where('employee_id', $employeeId)
            ->when($startDate && $endDate, fn($q) => $q->whereBetween('payment_date', [$startDate, $this->normalizeEndDate($endDate)]))
            ->select(
                DB::raw("COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END), 0) as paid"),
                DB::raw("COALESCE(SUM(CASE WHEN type = 'consumption' THEN amount ELSE 0 END), 0) as consumed"),
            )
            ->first();

        $totalPaid = (float) ($paid->paid ?? 0);
        $totalConsumed = (float) ($paid->consumed ?? 0);
        $totalEarned = $commission + $tips + $baseSalary;
        $pending = $totalEarned - $totalPaid + $totalConsumed;

        return [
            'commission' => round($commission, 2),
            'tips' => round($tips, 2),
            'base_salary' => round($baseSalary, 2),
            'total_earned' => round($totalEarned, 2),
            'total_paid' => round($totalPaid, 2),
            'total_consumed' => round($totalConsumed, 2),
            'pending' => round($pending, 2),
            'pay_type' => $payType,
            'pay_percentage' => round($payPercentage, 2),
            'employee_ves_rate' => round($employeeVesRate, 2),
        ];
    }

    /**
     * Appointment history for a specific employee.
     * Returns completed appointments with commission/earnings data.
     */
    public function getEmployeeHistory(
        string $businessId,
        string $employeeId,
        ?string $branchId = null,
        ?string $startDate = null,
        ?string $endDate = null,
    ): Collection {
        $query = DB::table('transactions')
            ->join('appointments', 'transactions.appointment_id', '=', 'appointments.id')
            ->leftJoin('clients', 'appointments.client_id', '=', 'clients.id')
            ->leftJoin('services', 'appointments.service_id', '=', 'services.id')
            ->where('transactions.business_id', $businessId)
            ->where(function ($q) use ($employeeId) {
                $q->where('appointments.employee_id', $employeeId)
                  ->orWhere('appointments.assistant_employee_id', $employeeId);
            })
            ->whereIn('appointments.status', ['completed', 'confirmed', 'pending'])
            ->select(
                'appointments.id as appointment_id',
                'appointments.start_time',
                'appointments.status',
                'appointments.payment_status',
                'appointments.employee_id',
                'appointments.assistant_employee_id',
                'appointments.employee_percentage_override',
                'clients.full_name as client_name',
                'services.name as service_name',
                'services.price as service_price',
                'transactions.total_amount',
                'transactions.employee_amount',
                'transactions.employee_percentage',
                'transactions.assistant_percentage',
                'transactions.tip_amount',
                'transactions.paid_at',
                'transactions.exchange_rate_used',
            )
            ->orderByDesc('transactions.paid_at');

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('appointments.branch_id')
                  ->orWhere('appointments.branch_id', $branchId);
            });
        }
        if ($startDate && $endDate) {
            $query->whereBetween('transactions.paid_at', [$startDate, $this->normalizeEndDate($endDate)]);
        }

        return $query->get()->map(function ($row) {
            $pct = (float) ($row->employee_percentage_override
                ?? $row->employee_percentage
                ?? 0);
            $tip = (float) ($row->tip_amount ?? 0);
            $empAmount = (float) ($row->employee_amount ?? 0);
            $earnings = $empAmount + $tip;
            $serviceAmount = $pct > 0 && $empAmount > 0
                ? round($empAmount / $pct * 100, 2)
                : (float) ($row->service_price ?? $row->total_amount ?? 0);

            return [
                'id' => $row->appointment_id,
                'date' => $row->paid_at ?? $row->start_time,
                'time' => $row->start_time,
                'client_name' => $row->client_name ?? '—',
                'service_name' => $row->service_name ?? '—',
                'service_price' => (float) ($row->service_price ?? $serviceAmount),
                'amount' => $serviceAmount,
                'percentage' => round($pct, 1),
                'earnings' => round($earnings, 2),
                'tip_amount' => round($tip, 2),
                'status' => $row->payment_status === 'paid' ? 'completed' : $row->status,
                'payment_status' => $row->payment_status,
                'exchange_rate_used' => (float) ($row->exchange_rate_used ?? 1),
            ];
        });
    }
}
