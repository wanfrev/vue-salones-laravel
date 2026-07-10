<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Services\FinancialSummaryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinancialSummaryController
{
    public function __construct(
        private FinancialSummaryService $financialService,
    ) {}

    private function resolveBusinessId(Request $request): ?string
    {
        return $request->user()?->profile?->business_id;
    }

    public function summary(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['buckets' => [], 'kpis' => []]);
        }

        $start = $request->get('start');
        $end = $request->get('end');
        $branchId = $request->get('branch_id');

        $buckets = $this->financialService->summary($businessId, $start, $end, $branchId);
        $kpis = $this->financialService->getKPIs($businessId, $start, $end, $branchId);

        return response()->json([
            'buckets' => $buckets,
            'kpis' => $kpis,
        ]);
    }

    public function transactions(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json([]);
        }

        return response()->json(
            $this->financialService->getTransactionsWithDetails(
                $businessId,
                $request->get('start'),
                $request->get('end'),
                $request->get('branch_id'),
            )
        );
    }

    public function productSales(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json([]);
        }

        return response()->json(
            $this->financialService->getProductSales(
                $businessId,
                $request->get('start'),
                $request->get('end'),
                $request->get('branch_id'),
            )
        );
    }
}
