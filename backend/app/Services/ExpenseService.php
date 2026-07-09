<?php

namespace App\Services;

use App\Models\Expense;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ExpenseService
{
    public function list(string $businessId, ?string $branchId = null, ?string $startDate = null, ?string $endDate = null): Collection
    {
        $query = Expense::query()
            ->where('business_id', $businessId)
            ->orderByDesc('expense_date');

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }
        if ($startDate) $query->where('expense_date', '>=', $startDate);
        if ($endDate) $query->where('expense_date', '<=', $endDate);

        return $query->get();
    }

    public function store(array $data, string $businessId, string $createdBy): Expense
    {
        return Expense::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'branch_id' => $data['branch_id'] ?? null,
            'name' => $data['name'],
            'category' => $data['category'] ?? 'general',
            'amount' => $data['amount'],
            'expense_date' => $data['expense_date'] ?? now()->toDateString(),
            'currency' => $data['currency'] ?? 'USD',
            'original_amount' => $data['original_amount'] ?? 0,
            'exchange_rate_used' => $data['exchange_rate_used'] ?? 1,
            'notes' => $data['notes'] ?? null,
            'created_by' => $createdBy,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function update(string $id, array $data, string $businessId): Expense
    {
        $expense = $this->findForBusiness($id, $businessId);
        $expense->update($data + ['updated_at' => now()]);
        return $expense->fresh();
    }

    public function destroy(string $id, string $businessId): void
    {
        $expense = $this->findForBusiness($id, $businessId);
        $expense->delete();
    }

    public function findForBusiness(string $id, string $businessId): Expense
    {
        $expense = Expense::find($id);
        if (!$expense || $expense->business_id !== $businessId) {
            throw new NotFoundHttpException('Gasto no encontrado.');
        }
        return $expense;
    }
}
