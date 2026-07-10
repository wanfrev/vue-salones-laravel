<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
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
        if (!$businessId) return response()->json([]);

        return response()->json(
            $this->paymentService->list(
                $businessId,
                $request->get('branch_id'),
                $request->get('start_date'),
                $request->get('end_date'),
                $request->get('employee_id'),
            )
        );
    }

    public function store(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['message' => 'Sin negocio asignado.'], 403);

        $data = $request->validate([
            'employee_id' => 'required|uuid',
            'amount' => 'required|numeric|min:0',
            'currency' => 'required|in:USD,VES',
            'original_amount' => 'nullable|numeric|min:0',
            'exchange_rate_used' => 'nullable|numeric|min:0',
            'payment_method' => 'required|string|max:50',
            'type' => 'required|in:payment,consumption',
            'concept' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:500',
            'payment_date' => 'required|date',
            'branch_id' => 'nullable|uuid',
        ]);

        $payment = $this->paymentService->store($data, $businessId, $request->user()->id);
        EntityChanged::safe($businessId, 'employee_payment', 'created', $payment->id);

        return response()->json($payment, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);

        $data = $request->validate([
            'amount' => 'sometimes|numeric|min:0',
            'currency' => 'sometimes|in:USD,VES',
            'original_amount' => 'nullable|numeric|min:0',
            'exchange_rate_used' => 'nullable|numeric|min:0',
            'payment_method' => 'sometimes|string|max:50',
            'payment_date' => 'sometimes|date',
            'notes' => 'nullable|string|max:500',
        ]);

        $payment = $this->paymentService->update($id, $data, $businessId);
        EntityChanged::safe($businessId, 'employee_payment', 'updated', $id);

        return response()->json($payment);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        $this->paymentService->destroy($id, $businessId);
        EntityChanged::safe($businessId, 'employee_payment', 'deleted', $id);

        return response()->json(null, 204);
    }
}
