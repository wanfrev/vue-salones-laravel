<?php

namespace App\Http\Controllers\Api;

use App\Services\FinancialSummaryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinancialSummaryController
{
    public function __construct(
        private FinancialSummaryService $financialService,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json([]);

        $start = $request->get('p_period_start');
        $end = $request->get('p_period_end');
        $branchId = $request->get('p_branch_id');
        $employeeId = $request->get('p_employee_id');

        $summary = $this->financialService->summary($p->business_id, $start, $end, $branchId, $employeeId);
        $kpis = $this->financialService->getKPIs($p->business_id, $start, $end, $branchId, $employeeId);

        return response()->json([
            'data' => $summary,
            'kpis' => $kpis,
        ]);
    }
}
