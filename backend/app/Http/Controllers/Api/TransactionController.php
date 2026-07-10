<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Services\FinancialSummaryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionController
{
    public function __construct(
        private FinancialSummaryService $financialService,
    ) {}

    private function resolveBusinessId(Request $request): ?string
    {
        return $request->user()?->profile?->business_id;
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);

        $data = $request->validate([
            'total_amount' => 'required|numeric|min:0',
            'method' => 'sometimes|string|max:50',
            'notes' => 'nullable|string|max:500',
            'exchange_rate_used' => 'nullable|numeric|min:0',
            'payments_breakdown' => 'nullable|array',
        ]);

        $tx = \App\Models\Transaction::where('business_id', $businessId)->find($id);
        if (!$tx) {
            return response()->json(['message' => 'Transacción no encontrada.'], 404);
        }

        $tx->update($data);

        EntityChanged::safe($businessId, 'transaction', 'updated', $id);

        return response()->json($tx->fresh());
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);

        $tx = \App\Models\Transaction::where('business_id', $businessId)->find($id);
        if (!$tx) {
            return response()->json(['message' => 'Transacción no encontrada.'], 404);
        }

        $tx->delete();

        EntityChanged::safe($businessId, 'transaction', 'deleted', $id);

        return response()->json(null, 204);
    }
}
