<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Http\Requests\ProcessSaleRequest;
use App\Http\Requests\DirectSaleRequest;
use App\Services\PosService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PosController
{
    public function __construct(
        private PosService $posService,
    ) {}

    private function resolveBusinessId(Request $request): ?string
    {
        return $request->user()?->profile?->business_id;
    }

    public function pendingAppointments(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json([]);

        return response()->json(
            $this->posService->getPendingAppointments($businessId, $request->get('branch_id'))
        );
    }

    public function saleableProducts(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json([]);

        return response()->json(
            $this->posService->getSaleableProducts($businessId, $request->get('branch_id'))
        );
    }

    public function recordSale(ProcessSaleRequest $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);

        $data = $request->validated();

        try {
            $txId = $this->posService->processSale(
                appointmentId: $data['appointment_id'],
                serviceAmount: (float) $data['service_amount'],
                method: $data['method'],
                products: $data['products'] ?? [],
                notes: $data['notes'] ?? null,
                exchangeRate: $data['exchange_rate_used'] ?? null,
                paymentsBreakdown: $data['payments_breakdown'] ?? [],
                tipAmount: $data['tip_amount'] ?? null,
                businessId: $businessId,
                createdBy: $request->user()->id,
            );

            EntityChanged::safe($businessId, 'transaction', 'created', $txId);

            return response()->json(['id' => $txId], 201);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function directSale(DirectSaleRequest $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);

        $data = $request->validated();

        try {
            $txId = $this->posService->processDirectSale(
                totalAmount: (float) $data['total_amount'],
                method: $data['method'],
                products: $data['products'],
                notes: $data['notes'] ?? null,
                exchangeRate: $data['exchange_rate_used'] ?? null,
                paymentsBreakdown: $data['payments_breakdown'] ?? [],
                clientId: $data['client_id'] ?? null,
                businessId: $businessId,
                branchId: $data['branch_id'] ?? null,
                createdBy: $request->user()->id,
            );

            EntityChanged::safe($businessId, 'transaction', 'created', $txId);

            return response()->json(['id' => $txId], 201);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }
}
