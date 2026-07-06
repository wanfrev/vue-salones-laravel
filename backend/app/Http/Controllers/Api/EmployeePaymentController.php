<?php

namespace App\Http\Controllers\Api;

use App\Models\EmployeePayment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class EmployeePaymentController
{
    /**
     * GET /api/employee-payments
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        $query = EmployeePayment::with('employeeProfile')
            ->where('business_id', $p->business_id)
            ->orderByDesc('payment_date');

        if ($request->branch_id) {
            $query->where('branch_id', $request->branch_id);
        }
        if ($request->start_date) {
            $query->where('payment_date', '>=', $request->start_date);
        }
        if ($request->end_date) {
            $query->where('payment_date', '<=', $request->end_date);
        }
        if ($request->employee_id) {
            $query->where('employee_id', $request->employee_id);
        }

        return response()->json($query->get());
    }

    /**
     * POST /api/employee-payments
     */
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

        $payment = EmployeePayment::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $p->business_id,
            'branch_id' => $data['branch_id'] ?? null,
            'employee_id' => $data['employee_id'],
            'amount' => $data['amount'],
            'currency' => $data['currency'],
            'original_amount' => $data['original_amount'] ?? 0,
            'exchange_rate_used' => $data['exchange_rate_used'] ?? 1,
            'payment_method' => $data['payment_method'],
            'type' => $data['type'],
            'concept' => $data['concept'] ?? null,
            'notes' => $data['notes'] ?? null,
            'payment_date' => $data['payment_date'],
            'created_by' => $user->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json($payment, 201);
    }

    /**
     * PUT /api/employee-payments/{id}
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $payment = EmployeePayment::find($id);
        if (!$payment || $payment->business_id !== $p?->business_id) {
            return response()->json(['error' => ['message' => 'Not found']], 404);
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

        $payment->update($data + ['updated_at' => now()]);

        return response()->json($payment->fresh());
    }

    /**
     * DELETE /api/employee-payments/{id}
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $payment = EmployeePayment::find($id);
        if (!$payment || $payment->business_id !== $p?->business_id) {
            return response()->json(['error' => ['message' => 'Not found']], 404);
        }

        $payment->delete();

        return response()->json(null, 204);
    }
}
