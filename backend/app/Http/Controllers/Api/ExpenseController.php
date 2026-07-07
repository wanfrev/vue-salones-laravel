<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Services\ExpenseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController
{
    public function __construct(
        private ExpenseService $expenseService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json([]);

        return response()->json(
            $this->expenseService->list($p->business_id, $request->branch_id, $request->start_date, $request->end_date)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'nullable|string|max:100',
            'amount' => 'required|numeric|min:0',
            'expense_date' => 'required|date',
            'currency' => 'required|in:USD,VES',
            'original_amount' => 'nullable|numeric|min:0',
            'exchange_rate_used' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:500',
            'branch_id' => 'nullable|uuid',
        ]);

        $expense = $this->expenseService->store($data, $p->business_id, $user->id);
        EntityChanged::dispatch($p->business_id, 'expense', 'created', $expense->id);
        return response()->json($expense, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

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

        $expense = $this->expenseService->update($id, $data, $p?->business_id);
        EntityChanged::dispatch($p->business_id, 'expense', 'updated', $id);
        return response()->json($expense);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $this->expenseService->destroy($id, $p?->business_id);
        EntityChanged::dispatch($p->business_id, 'expense', 'deleted', $id);
        return response()->json(null, 204);
    }
}
