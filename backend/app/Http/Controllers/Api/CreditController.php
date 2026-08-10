<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Models\Credit;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CreditController
{
    private function resolveBusinessId(Request $request): ?string
    {
        $fromProfile = $request->user()?->profile?->business_id;
        if ($fromProfile) {
            return $fromProfile;
        }
        $raw = $request->query('business_id');
        if ($raw && preg_match('/eq\.(.+)/', $raw, $m)) {
            return $m[1];
        }
        return $raw ?: null;
    }

    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json([]);
        }

        $query = Credit::where('business_id', $businessId)
            ->with('client:id,full_name,phone');

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('branch_id')) {
            $branchId = $request->query('branch_id');
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        return response()->json($query->orderByDesc('created_at')->get());
    }

    public function markPaid(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        $data = $request->validate([
            'method' => 'required|string|max:50|not_in:credito',
            'currency' => 'nullable|string|in:USD,VES',
            'exchange_rate' => 'nullable|numeric|min:0',
        ]);

        $credit = Credit::where('business_id', $businessId)->find($id);
        if (!$credit) {
            return response()->json(['message' => 'Crédito no encontrado.'], 404);
        }
        if ($credit->status === 'paid') {
            return response()->json(['message' => 'Este crédito ya fue pagado.'], 422);
        }

        DB::transaction(function () use ($credit, $data) {
            $tx = Transaction::find($credit->transaction_id);
            if (!$tx) {
                throw new \RuntimeException('La transacción original no existe.');
            }

            $currency = $data['currency'] ?? 'USD';
            $rate = (float) ($data['exchange_rate'] ?? $tx->exchange_rate_used ?? 1);
            $amount = (float) $credit->amount;

            $tx->update([
                'method' => $data['method'],
                'payments_breakdown' => [[
                    'method' => $data['method'],
                    'currency' => $currency,
                    'inputAmount' => $currency === 'VES' ? round($amount * $rate, 2) : $amount,
                    'amount' => $amount,
                ]],
                'exchange_rate_used' => $rate,
                'paid_at' => now(),
            ]);

            $credit->update([
                'status' => 'paid',
                'paid_at' => now(),
                'paid_method' => $data['method'],
            ]);
        });

        EntityChanged::safe($businessId, 'credit', 'updated', $id);

        return response()->json($credit->fresh()->load('client:id,full_name,phone'));
    }
}
