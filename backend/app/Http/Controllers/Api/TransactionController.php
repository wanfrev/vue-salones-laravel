<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Services\FinancialSummaryService;
use App\Services\PosService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionController
{
    public function __construct(
        private FinancialSummaryService $financialService,
        private PosService $posService,
    ) {}

    private function resolveBusinessId(Request $request): ?string
    {
        return $request->user()?->profile?->business_id;
    }

    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json([]);

        $data = $this->financialService->getTransactionsUnified(
            $businessId,
            $request->get('start'),
            $request->get('end'),
            $request->get('branch_id'),
        );

        return response()->json($data);
    }

    public function store(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'appointment_id' => 'required|uuid',
            'amount' => 'required|numeric|min:0',
            'method' => 'required|string|max:50',
            'notes' => 'nullable|string',
            'exchange_rate_used' => 'nullable|numeric|min:0',
            'payments_breakdown' => 'nullable|array',
        ]);

        try {
            $txId = $this->posService->recordPayment(
                appointmentId: $data['appointment_id'],
                amount: $data['amount'],
                method: $data['method'],
                notes: $data['notes'] ?? null,
                exchangeRate: $data['exchange_rate_used'] ?? null,
                paymentsBreakdown: $data['payments_breakdown'] ?? [],
                businessId: $businessId,
                createdBy: $request->user()->id,
            );

            EntityChanged::safe($businessId, 'transaction', 'created', $txId);
            return response()->json(['id' => $txId], 201);
        } catch (\Throwable $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 400);
        }
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);

        $data = $request->validate([
            'amount' => 'required|numeric|min:0',
            'method' => 'sometimes|string|max:50',
            'notes' => 'nullable|string',
            'exchange_rate_used' => 'nullable|numeric|min:0',
            'payments_breakdown' => 'nullable|array',
        ]);

        try {
            $tx = $this->posService->updateTransaction(
                transactionId: $id,
                amount: $data['amount'],
                method: $data['method'] ?? 'cash',
                notes: $data['notes'] ?? null,
                exchangeRate: $data['exchange_rate_used'] ?? null,
                paymentsBreakdown: $data['payments_breakdown'] ?? null,
                businessId: $businessId,
            );

            EntityChanged::safe($businessId, 'transaction', 'updated', $id);
            return response()->json($tx);
        } catch (\Throwable $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 400);
        }
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);

        try {
            $this->posService->deleteTransaction($id, $businessId);
            EntityChanged::safe($businessId, 'transaction', 'deleted', $id);
            return response()->json(null, 204);
        } catch (\Throwable $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 400);
        }
    }
}
