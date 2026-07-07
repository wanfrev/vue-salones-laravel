<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Jobs\ProcessPayment;
use App\Jobs\ProcessSale;
use App\Services\PosService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PosController
{
    public function __construct(
        private PosService $posService,
    ) {}

    public function pendingAppointments(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json([]);

        return response()->json(
            $this->posService->pendingAppointments($p->business_id, $request->branch_id)
        );
    }

    public function saleableProducts(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json([]);

        return response()->json(
            $this->posService->saleableProducts($p->business_id, $request->branch_id)
        );
    }

    public function recordPayment(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

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
                businessId: $p->business_id,
                createdBy: $user->id,
            );

            EntityChanged::dispatch($p->business_id, 'transaction', 'created', $txId);

            ProcessPayment::dispatch(
                transactionId: $txId,
                businessId: $p->business_id,
                appointmentId: $data['appointment_id'],
                amount: $data['amount'],
                method: $data['method'],
            );

            return response()->json(['id' => $txId], 201);
        } catch (\Throwable $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 400);
        }
    }

    public function recordSale(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'appointment_id' => 'required|uuid',
            'amount' => 'required|numeric|min:0',
            'method' => 'required|string|max:50',
            'notes' => 'nullable|string',
            'exchange_rate_used' => 'nullable|numeric|min:0',
            'payments_breakdown' => 'nullable|array',
            'products' => 'nullable|array',
            'products.*.product_id' => 'required|uuid',
            'products.*.quantity' => 'required|numeric|min:0.01',
            'products.*.unit_cost' => 'nullable|numeric|min:0',
            'products.*.variant_id' => 'nullable|uuid',
            'products.*.location_id' => 'nullable|uuid',
        ]);

        try {
            $txId = $this->posService->recordSale(
                appointmentId: $data['appointment_id'],
                amount: $data['amount'],
                method: $data['method'],
                products: $data['products'] ?? [],
                notes: $data['notes'] ?? null,
                exchangeRate: $data['exchange_rate_used'] ?? null,
                paymentsBreakdown: $data['payments_breakdown'] ?? [],
                businessId: $p->business_id,
                createdBy: $user->id,
            );

            EntityChanged::dispatch($p->business_id, 'transaction', 'created', $txId);

            ProcessSale::dispatch(
                transactionId: $txId,
                businessId: $p->business_id,
                appointmentId: $data['appointment_id'],
                amount: $data['amount'],
                method: $data['method'],
                products: $data['products'] ?? [],
            );

            return response()->json(['id' => $txId], 201);
        } catch (\Throwable $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 400);
        }
    }

    public function markAppointmentsAsPaid(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'appointment_ids' => 'required|array',
            'appointment_ids.*' => 'uuid',
        ]);

        $this->posService->markAppointmentsAsPaid($data['appointment_ids'], $p->business_id);
        return response()->json(['success' => true]);
    }
}
