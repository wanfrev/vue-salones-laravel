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

    public function index(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json([]);

        return response()->json(
            $this->paymentService->list($p->business_id, $request->supplier_id)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'supplier_id' => 'required|uuid',
            'amount' => 'required|numeric|min:0',
            'payment_method' => 'required|string|max:50',
            'payment_date' => 'required|date',
            'notes' => 'nullable|string|max:500',
            'branch_id' => 'nullable|uuid',
        ]);

        $payment = $this->paymentService->store($data, $p->business_id, $user->id);
        EntityChanged::dispatch($p->business_id, 'supplier_payment', 'created', $payment->id);
        return response()->json($payment, 201);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $this->paymentService->destroy($id, $p?->business_id);
        EntityChanged::dispatch($p->business_id, 'supplier_payment', 'deleted', $id);
        return response()->json(null, 204);
    }
}
