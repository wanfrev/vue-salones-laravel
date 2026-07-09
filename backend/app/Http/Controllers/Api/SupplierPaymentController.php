<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Services\SupplierPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierPaymentController
{
    public function __construct(
        private SupplierPaymentService $paymentService,
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
            $this->paymentService->list($businessId, $request->supplier_id)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'supplier_id' => 'required|uuid',
            'amount' => 'required|numeric|min:0',
            'payment_method' => 'required|string|max:50',
            'payment_date' => 'required|date',
            'notes' => 'nullable|string|max:500',
            'branch_id' => 'nullable|uuid',
        ]);

        $payment = $this->paymentService->store($data, $businessId, $request->user()->id);
        EntityChanged::safe($businessId, 'supplier_payment', 'created', $payment->id);
        return response()->json($payment, 201);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);

        $this->paymentService->destroy($id, $businessId);
        EntityChanged::safe($businessId, 'supplier_payment', 'deleted', $id);
        return response()->json(null, 204);
    }
}
