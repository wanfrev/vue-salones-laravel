<?php

namespace App\Http\Controllers\Api;

use App\Services\EmployeeCommissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeCommissionController
{
    public function __construct(
        private EmployeeCommissionService $commissionService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        $rows = $this->commissionService->getBreakdown(
            $p->business_id,
            $request->get('start_date'),
            $request->get('end_date'),
            $request->get('branch_id'),
        );

        return response()->json($rows);
    }
}
