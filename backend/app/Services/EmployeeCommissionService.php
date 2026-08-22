<?php

namespace App\Services;

use App\Models\Business;
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
            $query->whereBetween('appointments.start_time', [$startDate, $this->normalizeEndDate($endDate)]);
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
                'profiles.employee_ves_rate',
                DB::raw('COALESCE(SUM(transactions.employee_amount), 0) as commission'),
                DB::raw('COALESCE(SUM(transactions.tip_amount), 0) as tips'),
                DB::raw('COALESCE(SUM(transactions.employee_amount * transactions.exchange_rate_used), 0) as commission_bs'),
                DB::raw('COALESCE(SUM(transactions.tip_amount * transactions.exchange_rate_used), 0) as tips_bs'),
                DB::raw("COALESCE(SUM(CASE WHEN transactions.tip_currency = 'USD' THEN transactions.tip_amount ELSE 0 END), 0) as tips_usd"),
                DB::raw("COALESCE(SUM(CASE WHEN transactions.tip_currency = 'VES' THEN transactions.tip_amount * transactions.exchange_rate_used ELSE 0 END), 0) as tips_ves"),
                DB::raw("COALESCE(SUM(CASE WHEN transactions.tip_amount > 0 AND (transactions.tip_currency IS NULL OR transactions.tip_currency NOT IN ('USD', 'VES')) THEN transactions.tip_amount ELSE 0 END), 0) as tips_unspecified"),
            )
            ->groupBy('profiles.id', 'profiles.full_name', 'profiles.pay_type', 'profiles.pay_percentage', 'profiles.base_salary', 'profiles.employee_ves_rate');

        if ($startDate && $endDate) {
            $earningsQuery->whereBetween('appointments.start_time', [$startDate, $this->normalizeEndDate($endDate)]);
        } else {
            $earningsQuery->whereRaw('1 = 0');
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
            $paidQuery->whereDate('payment_date', '>=', $startDate)
                       ->whereDate('payment_date', '<=', $endDate);
        } else {
            $paidQuery->whereRaw('1 = 0');
        }
        if ($branchId) {
            $paidQuery->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        $paid = $paidQuery->get()->keyBy('employee_id');

        return $earnings->map(function ($row) use ($paid, $businessId) {
            $p = $paid->get($row->employee_id);
            $totalPaid = (float) ($p->paid ?? 0);
            $totalConsumed = (float) ($p->consumed ?? 0);
            $commission = (float) $row->commission;
            $tips = (float) $row->tips;
            $base = (float) ($row->base_salary ?? 0);
            $totalEarned = $commission + $tips + $base;
            $pending = $totalEarned - $totalPaid - $totalConsumed;

            $commissionBs = (float) $row->commission_bs;
            $tipsBs = (float) $row->tips_bs;
            $totalEarnedBs = $commissionBs + $tipsBs;
            $pendingBsEstimated = $totalEarned > 0 ? $pending * ($totalEarnedBs / $totalEarned) : 0;

            $profileRate = (float) ($row->employee_ves_rate ?? 0);
            $businessRate = (float) (Business::where('id', $businessId)->value('employee_ves_rate') ?? 0);
            $employeeVesRate = $profileRate > 0 ? $profileRate : $businessRate;

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
                'employee_ves_rate' => round($employeeVesRate, 2),
                'commission_bs' => round($commissionBs, 2),
                'tips_bs' => round($tipsBs, 2),
                'total_earned_bs' => round($totalEarnedBs, 2),
                'pending_bs_estimated' => round($pendingBsEstimated, 2),
                'tips_usd' => round((float) $row->tips_usd, 2),
                'tips_ves' => round((float) $row->tips_ves, 2),
                'tips_unspecified' => round((float) $row->tips_unspecified, 2),
            ];
        })->values();
    }

    /**
     * Get employee balance for a specific employee + date range.
     */
    public function getEmployeeBalance(
        string $businessId,
        string $employeeId,
        ?string $branchId = null,
        ?string $startDate = null,
        ?string $endDate = null,
    ): array {
        $dateFilter = function ($q) use ($startDate, $endDate) {
            if ($startDate && $endDate) {
                $q->whereBetween('appointments.start_time', [$startDate, $this->normalizeEndDate($endDate)]);
            }
        };
        $branchFilter = function ($q) use ($branchId) {
            if ($branchId) {
                $q->where(function ($sq) use ($branchId) {
                    $sq->whereNull('appointments.branch_id')
                       ->orWhere('appointments.branch_id', $branchId);
                });
            }
        };

        // Earned as main employee
        $mainEarned = DB::table('transactions')
            ->join('appointments', 'transactions.appointment_id', '=', 'appointments.id')
            ->where('transactions.business_id', $businessId)
            ->where('appointments.employee_id', $employeeId)
            ->whereIn('appointments.status', ['confirmed', 'completed', 'pending'])
            ->where($dateFilter)
            ->where($branchFilter)
            ->select(
                DB::raw('COALESCE(SUM(transactions.employee_amount), 0) as commission'),
                DB::raw('COALESCE(SUM(transactions.tip_amount), 0) as tips'),
                DB::raw('COALESCE(SUM(transactions.employee_amount * transactions.exchange_rate_used), 0) as commission_bs'),
                DB::raw('COALESCE(SUM(transactions.tip_amount * transactions.exchange_rate_used), 0) as tips_bs'),
                DB::raw("COALESCE(SUM(CASE WHEN transactions.tip_currency = 'USD' THEN transactions.tip_amount ELSE 0 END), 0) as tips_usd"),
                DB::raw("COALESCE(SUM(CASE WHEN transactions.tip_currency = 'VES' THEN transactions.tip_amount * transactions.exchange_rate_used ELSE 0 END), 0) as tips_ves"),
                DB::raw("COALESCE(SUM(CASE WHEN transactions.tip_amount > 0 AND (transactions.tip_currency IS NULL OR transactions.tip_currency NOT IN ('USD', 'VES')) THEN transactions.tip_amount ELSE 0 END), 0) as tips_unspecified"),
            )
            ->first();

        // Earned as assistant
        $assistantEarned = DB::table('transactions')
            ->join('appointments', 'transactions.appointment_id', '=', 'appointments.id')
            ->where('transactions.business_id', $businessId)
            ->where('appointments.assistant_employee_id', $employeeId)
            ->whereIn('appointments.status', ['confirmed', 'completed', 'pending'])
            ->where($dateFilter)
            ->where($branchFilter)
            ->select(
                DB::raw('COALESCE(SUM(transactions.assistant_amount), 0) as commission'),
                DB::raw('COALESCE(SUM(transactions.tip_amount), 0) as tips'),
                DB::raw('COALESCE(SUM(transactions.assistant_amount * transactions.exchange_rate_used), 0) as commission_bs'),
                DB::raw('COALESCE(SUM(transactions.tip_amount * transactions.exchange_rate_used), 0) as tips_bs'),
                DB::raw("COALESCE(SUM(CASE WHEN transactions.tip_currency = 'USD' THEN transactions.tip_amount ELSE 0 END), 0) as tips_usd"),
                DB::raw("COALESCE(SUM(CASE WHEN transactions.tip_currency = 'VES' THEN transactions.tip_amount * transactions.exchange_rate_used ELSE 0 END), 0) as tips_ves"),
                DB::raw("COALESCE(SUM(CASE WHEN transactions.tip_amount > 0 AND (transactions.tip_currency IS NULL OR transactions.tip_currency NOT IN ('USD', 'VES')) THEN transactions.tip_amount ELSE 0 END), 0) as tips_unspecified"),
            )
            ->first();

        $commission = (float) ($mainEarned->commission ?? 0) + (float) ($assistantEarned->commission ?? 0);
        $tips = (float) ($mainEarned->tips ?? 0) + (float) ($assistantEarned->tips ?? 0);
        $commissionBs = (float) ($mainEarned->commission_bs ?? 0) + (float) ($assistantEarned->commission_bs ?? 0);
        $tipsBs = (float) ($mainEarned->tips_bs ?? 0) + (float) ($assistantEarned->tips_bs ?? 0);
        $tipsUsd = (float) ($mainEarned->tips_usd ?? 0) + (float) ($assistantEarned->tips_usd ?? 0);
        $tipsVes = (float) ($mainEarned->tips_ves ?? 0) + (float) ($assistantEarned->tips_ves ?? 0);
        $tipsUnspecified = (float) ($mainEarned->tips_unspecified ?? 0) + (float) ($assistantEarned->tips_unspecified ?? 0);

        $profile = Profile::find($employeeId);
        $baseSalary = $profile ? (float) ($profile->base_salary ?? 0) : 0;
        $payType = $profile ? ($profile->pay_type ?? null) : null;
        $payPercentage = $profile ? (float) ($profile->pay_percentage ?? 0) : 0;
        $profileRate = $profile ? (float) ($profile->employee_ves_rate ?? 0) : 0;
        $businessRate = (float) (Business::where('id', $businessId)->value('employee_ves_rate') ?? 0);
        $employeeVesRate = $profileRate > 0 ? $profileRate : $businessRate;

        // Paid
        $paid = DB::table('employee_payments')
            ->where('business_id', $businessId)
            ->where('employee_id', $employeeId)
            ->when($branchId, fn($q) => $q->where(fn($sq) => $sq->whereNull('branch_id')->orWhere('branch_id', $branchId)))
            ->when($startDate && $endDate, fn($q) => $q
                ->whereDate('payment_date', '>=', $startDate)
                ->whereDate('payment_date', '<=', $endDate))
            ->when(!($startDate && $endDate), fn($q) => $q->whereRaw('1 = 0'))
            ->select(
                DB::raw("COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END), 0) as paid"),
                DB::raw("COALESCE(SUM(CASE WHEN type = 'consumption' THEN amount ELSE 0 END), 0) as consumed"),
            )
            ->first();

        $totalPaid = (float) ($paid->paid ?? 0);
        $totalConsumed = (float) ($paid->consumed ?? 0);
        $totalEarned = $commission + $tips + $baseSalary;
        $pending = $totalEarned - $totalPaid - $totalConsumed;

        $totalEarnedBs = $commissionBs + $tipsBs;
        $pendingBsEstimated = $totalEarned > 0 ? $pending * ($totalEarnedBs / $totalEarned) : 0;

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
            'commission_bs' => round($commissionBs, 2),
            'tips_bs' => round($tipsBs, 2),
            'total_earned_bs' => round($totalEarnedBs, 2),
            'pending_bs_estimated' => round($pendingBsEstimated, 2),
            'tips_usd' => round($tipsUsd, 2),
            'tips_ves' => round($tipsVes, 2),
            'tips_unspecified' => round($tipsUnspecified, 2),
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
                'appointments.group_id',
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
                'transactions.assistant_amount',
                'transactions.employee_percentage',
                'transactions.assistant_percentage',
                'transactions.tip_amount',
                'transactions.paid_at',
                'transactions.exchange_rate_used',
                'transactions.payments_breakdown',
                'transactions.tip_currency',
            )
            ->orderByDesc('appointments.start_time');

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('appointments.branch_id')
                  ->orWhere('appointments.branch_id', $branchId);
            });
        }
        if ($startDate && $endDate) {
            $query->whereBetween('appointments.start_time', [$startDate, $this->normalizeEndDate($endDate)]);
        }

        return $query->get()->map(function ($row) use ($employeeId) {
            $isAssistant = $row->assistant_employee_id === $employeeId;
            $pct = (float) ($isAssistant
                ? ($row->assistant_percentage ?? 0)
                : ($row->employee_percentage_override ?? $row->employee_percentage ?? 0));
            $tip = (float) ($row->tip_amount ?? 0);
            $empAmount = (float) ($isAssistant
                ? ($row->assistant_amount ?? 0)
                : ($row->employee_amount ?? 0));
            $earnings = $empAmount + $tip;
            $serviceAmount = $pct > 0 && $empAmount > 0
                ? round($empAmount / $pct * 100, 2)
                : (float) ($row->service_price ?? $row->total_amount ?? 0);

            // Which currency the tip was physically paid in. Prefer the explicit value the
            // cashier chose at checkout (transactions.tip_currency); older transactions
            // predating that field fall back to inferring it from how the whole payment was
            // collected — 'payments_breakdown' records the currency per payment split, which
            // attributes cleanly to the tip only when there was a single payment method.
            $tipCurrency = null;
            if ($tip > 0) {
                if (!empty($row->tip_currency)) {
                    $tipCurrency = $row->tip_currency;
                } else {
                    $breakdown = json_decode($row->payments_breakdown ?? '[]', true) ?: [];
                    if (count($breakdown) === 1 && isset($breakdown[0]['currency'])) {
                        $tipCurrency = $breakdown[0]['currency'];
                    } elseif (count($breakdown) > 1) {
                        $tipCurrency = 'mixed';
                    }
                }
            }

            return [
                'id' => $row->appointment_id,
                'group_id' => $row->group_id ?? null,
                'date' => $row->start_time,
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
                'tip_currency' => $tipCurrency,
            ];
        });
    }
}
