<?php

namespace App\Http\Controllers\Api;

use App\Services\EmployeeCommissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeBalanceController
{
    public function __construct(
        private EmployeeCommissionService $commissionService,
    ) {}

    public function show(Request $request, string $employeeId): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $balance = $this->commissionService->getEmployeeBalance(
            $employeeId,
            $p?->business_id,
            $request->get('year_month'),
            $request->get('start_date'),
            $request->get('end_date'),
        );

        return response()->json($balance);
    }
}
