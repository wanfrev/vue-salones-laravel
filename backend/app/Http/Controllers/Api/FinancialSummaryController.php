<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FinancialSummaryController
{
    /**
     * POST /api/rpc/financial-summary
     * Replaces supabase.rpc('financial_summary', ...).
     */
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        $start = $request->get('p_period_start');
        $end = $request->get('p_period_end');
        $branchId = $request->get('p_branch_id');

        $query = DB::table('transactions')
            ->where('business_id', $p->business_id)
            ->whereBetween('paid_at', [$start . ' 00:00:00', $end . ' 23:59:59'])
            ->select(
                DB::raw("to_char(paid_at, 'YYYY-MM-DD') as bucket"),
                DB::raw('count(*) as appointments'),
                DB::raw('sum(total_amount) as total_amount'),
                DB::raw('sum(local_amount) as local_amount'),
                DB::raw('sum(employee_amount) as employee_amount')
            )
            ->groupBy(DB::raw("to_char(paid_at, 'YYYY-MM-DD')"))
            ->orderBy('bucket');

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        return response()->json($query->get());
    }
}
