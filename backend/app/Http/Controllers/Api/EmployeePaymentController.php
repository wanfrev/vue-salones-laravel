<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Http\Requests\StoreEmployeePaymentRequest;
use App\Services\EmployeePaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeePaymentController
{
    public function __construct(
        private EmployeePaymentService $paymentService,
    ) {}

    private function resolveBusinessId(Request $request): ?string
    {
        return $request->user()?->profile?->business_id;
    }

    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json([]);
        }

        return response()->json(
            $this->paymentService->list(
                $businessId,
                $request->branch_id,
                $request->start_date,
                $request->end_date,
                $request->employee_id,
            )
        );
    }

    public function store(StoreEmployeePaymentRequest $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $payment = $this->paymentService->store($request->validated(), $businessId, $request->user()->id);
        EntityChanged::safe($businessId, 'employee_payment', 'created', $payment->id);
        return response()->json($payment, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validate([
            'amount' => 'sometimes|numeric|min:0',
            'currency' => 'sometimes|in:USD,VES',
            'payment_method' => 'sometimes|string|max:50',
            'notes' => 'nullable|string|max:500',
            'payment_date' => 'sometimes|date',
            'exchange_rate_used' => 'nullable|numeric|min:0',
            'original_amount' => 'nullable|numeric|min:0',
        ]);

        $payment = $this->paymentService->update($id, $data, $businessId);
        EntityChanged::safe($businessId, 'employee_payment', 'updated', $id);
        return response()->json($payment);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $this->paymentService->destroy($id, $businessId);
        EntityChanged::safe($businessId, 'employee_payment', 'deleted', $id);
        return response()->json(null, 204);
    }
}
