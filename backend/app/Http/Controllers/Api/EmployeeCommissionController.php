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

    private function resolveBusinessId(Request $request): ?string
    {
        return $request->user()?->profile?->business_id;
    }

    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json([]);

        return response()->json(
            $this->commissionService->getCommissions(
                $businessId,
                $request->get('branch_id'),
                $request->get('start_date'),
                $request->get('end_date'),
            )
        );
    }

    public function debt(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json([]);

        return response()->json(
            $this->commissionService->getEmployeeDebt(
                $businessId,
                $request->get('branch_id'),
                $request->get('start_date'),
                $request->get('end_date'),
            )
        );
    }

    public function balance(Request $request, string $employeeId): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['pending' => 0], 200);

        return response()->json(
            $this->commissionService->getEmployeeBalance(
                $businessId,
                $employeeId,
                $request->get('start_date'),
                $request->get('end_date'),
            )
        );
    }
}
