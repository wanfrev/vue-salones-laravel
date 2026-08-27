<?php

namespace App\Http\Controllers\Api\Staffing;

use App\Services\Staffing\StaffingReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StaffingReportController
{
    public function __construct(
        private StaffingReportService $reports,
    ) {}

    public function headcountMatrix(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['weeks' => [], 'companies' => []]);
        }

        $data = $request->validate([
            'year' => 'required|integer|min:2000|max:2100',
            'status' => 'nullable|in:active,inactive,on_hold',
        ]);

        return response()->json(
            $this->reports->weeklyHeadcountByCompany($p->business_id, (int) $data['year'], $data['status'] ?? null)
        );
    }

    public function monthlyPayroll(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['weeks' => [], 'companies' => []]);
        }

        $data = $request->validate([
            'year' => 'required|integer|min:2000|max:2100',
            'month' => 'required|integer|min:1|max:12',
        ]);

        return response()->json(
            $this->reports->monthlyPayrollByCompany($p->business_id, (int) $data['year'], (int) $data['month'])
        );
    }

    public function weeklyReport(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        $data = $request->validate([
            'week_start' => 'required|date',
        ]);

        return response()->json(
            $this->reports->weeklyCompanyReport($p->business_id, $data['week_start'])
        );
    }

    public function employeeHours(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['weeks' => [], 'employees' => []]);
        }

        // Laravel's `boolean` rule only accepts true/false/0/1/'0'/'1' — not the literal query
        // string "true"/"false" the frontend sends (`?active=${active.value}`) — so this must be
        // normalized before validate() or every request here fails validation and the UI falls
        // back to its "no employees" empty state, indistinguishable from a genuinely empty result.
        // Absent entirely (the "Todos" tab) means no filter at all, not "false" — left out of the
        // merge so it stays unset for the nullable rule below instead of being coerced to false.
        if ($request->query('active') !== null) {
            $request->merge(['active' => filter_var($request->query('active'), FILTER_VALIDATE_BOOL)]);
        }

        $data = $request->validate([
            'year' => 'required|integer|min:2000|max:2100',
            'active' => 'nullable|boolean',
        ]);

        return response()->json(
            $this->reports->employeeHoursMatrix($p->business_id, (int) $data['year'], $data['active'] ?? null)
        );
    }

    /** Total hours per company for a week, a month, or a whole year — see companyHoursSummary(). */
    public function companyHours(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        $data = $request->validate([
            'period' => 'required|in:week,month,year',
            'year' => 'required|integer|min:2000|max:2100',
            'month' => 'required_if:period,month|integer|min:1|max:12',
            'week_start' => 'required_if:period,week|date',
        ]);

        $weeks = $this->reports->weeksForYear((int) $data['year']);

        $weekStarts = match ($data['period']) {
            'week' => [$data['week_start']],
            'month' => array_values(array_filter(
                array_column($weeks, 'week_start'),
                fn (string $ws) => (int) substr($ws, 5, 2) === (int) $data['month'],
            )),
            default => array_column($weeks, 'week_start'),
        };

        return response()->json(
            $this->reports->companyHoursSummary($p->business_id, $weekStarts)
        );
    }

    /** Finanzas > Resumen for staffing: invoiced hours, employer cost, and margin for a date range. */
    public function financeSummary(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['invoiceTotal' => 0, 'employerCost' => 0, 'margin' => 0]);
        }

        $data = $request->validate([
            'period_start' => 'required|date',
            'period_end' => 'required|date|after_or_equal:period_start',
        ]);

        return response()->json(
            $this->reports->financeSummaryForPeriod($p->business_id, $data['period_start'], $data['period_end'])
        );
    }

    /**
     * "Lista de depósitos" for a week: one row per (employee, company) whose payout is due by
     * direct deposit — the same list the agency used to hand-copy onto paper before running to
     * the bank. See StaffingReportService::depositListForWeek for the eligibility rules.
     */
    public function depositList(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        $data = $request->validate([
            'week_start' => 'required|date',
            'company_id' => 'nullable|uuid',
        ]);

        return response()->json(
            $this->reports->depositListForWeek($p->business_id, $data['week_start'], $data['company_id'] ?? null)
        );
    }

    public function annualTaxReport(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['entities' => [], 'employees' => []]);
        }

        $data = $request->validate([
            'year' => 'required|integer|min:2000|max:2100',
        ]);

        return response()->json(
            $this->reports->annualTaxReport($p->business_id, (int) $data['year'])
        );
    }
}
