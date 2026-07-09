<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Http\Requests\StoreExpenseRequest;
use App\Services\ExpenseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController
{
    public function __construct(
        private ExpenseService $expenseService,
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
            $this->expenseService->list($businessId, $request->branch_id, $request->start_date, $request->end_date)
        );
    }

    public function store(StoreExpenseRequest $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $expense = $this->expenseService->store($request->validated(), $businessId, $request->user()->id);
        EntityChanged::safe($businessId, 'expense', 'created', $expense->id);
        return response()->json($expense, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'category' => 'nullable|string|max:100',
            'amount' => 'sometimes|numeric|min:0',
            'expense_date' => 'sometimes|date',
            'currency' => 'sometimes|in:USD,VES',
            'original_amount' => 'nullable|numeric|min:0',
            'exchange_rate_used' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:500',
        ]);

        $expense = $this->expenseService->update($id, $data, $businessId);
        EntityChanged::safe($businessId, 'expense', 'updated', $id);
        return response()->json($expense);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);

        $this->expenseService->destroy($id, $businessId);
        EntityChanged::safe($businessId, 'expense', 'deleted', $id);
        return response()->json(null, 204);
    }
}
