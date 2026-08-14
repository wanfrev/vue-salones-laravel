<?php

namespace App\Http\Controllers\Api;

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
}
