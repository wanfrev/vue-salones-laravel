<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ResolvesBusinessId;
use App\Services\EmployeeCommissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeCommissionController
{
    use ResolvesBusinessId;

    public function __construct(
        private EmployeeCommissionService $commissionService,
    ) {}

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
                $request->get('branch_id'),
                $request->get('start_date'),
                $request->get('end_date'),
            )
        );
    }

    public function history(Request $request, string $employeeId): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json([]);

        return response()->json(
            $this->commissionService->getEmployeeHistory(
                $businessId,
                $employeeId,
                $request->get('branch_id'),
                $request->get('start_date'),
                $request->get('end_date'),
            )
        );
    }
}
