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

    public function index(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        return response()->json(
            $this->paymentService->list(
                $p->business_id,
                $request->branch_id,
                $request->start_date,
                $request->end_date,
                $request->employee_id,
            )
        );
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validate([
            'employee_id' => 'required|uuid',
            'amount' => 'required|numeric|min:0',
            'currency' => 'required|in:USD,VES',
            'payment_method' => 'required|string|max:50',
            'type' => 'required|in:payment,consumption',
            'concept' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:500',
            'payment_date' => 'required|date',
            'exchange_rate_used' => 'nullable|numeric|min:0',
            'original_amount' => 'nullable|numeric|min:0',
            'branch_id' => 'nullable|uuid',
        ]);

        $payment = $this->paymentService->store($data, $p->business_id, $user->id);
        EntityChanged::dispatch($p->business_id, 'employee_payment', 'created', $payment->id);
        return response()->json($payment, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $data = $request->validate([
            'amount' => 'sometimes|numeric|min:0',
            'currency' => 'sometimes|in:USD,VES',
            'payment_method' => 'sometimes|string|max:50',
            'notes' => 'nullable|string|max:500',
            'payment_date' => 'sometimes|date',
            'exchange_rate_used' => 'nullable|numeric|min:0',
            'original_amount' => 'nullable|numeric|min:0',
        ]);

        $payment = $this->paymentService->update($id, $data, $p?->business_id);
        EntityChanged::dispatch($p->business_id, 'employee_payment', 'updated', $id);
        return response()->json($payment);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $this->paymentService->destroy($id, $p?->business_id);
        EntityChanged::dispatch($p->business_id, 'employee_payment', 'deleted', $id);
        return response()->json(null, 204);
    }
}
