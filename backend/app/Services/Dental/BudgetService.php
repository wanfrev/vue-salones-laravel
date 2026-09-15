<?php

namespace App\Services\Dental;

use App\Models\Dental\Budget;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BudgetService
{
    public function listForClient(string $clientId, string $businessId)
    {
        return Budget::where('client_id', $clientId)
            ->where('business_id', $businessId)
            ->orderByDesc('created_at')
            ->get();
    }

    public function findForClient(string $id, string $clientId, string $businessId): ?Budget
    {
        return Budget::where('id', $id)
            ->where('client_id', $clientId)
            ->where('business_id', $businessId)
            ->first();
    }

    /**
     * @param array<int, array{tooth?: int|null, description: string, service_id?: string|null, price: float, included: bool}> $items
     */
    private function computeTotal(array $items): float
    {
        return array_reduce($items, fn ($sum, $item) => $sum + ($item['included'] ?? true ? (float) ($item['price'] ?? 0) : 0), 0.0);
    }

    public function create(string $clientId, string $businessId, ?string $branchId, array $data, ?string $createdBy): Budget
    {
        return DB::transaction(function () use ($clientId, $businessId, $branchId, $data, $createdBy) {
            $items = $data['items'] ?? [];
            return Budget::create([
                'id' => Str::uuid()->toString(),
                'business_id' => $businessId,
                'branch_id' => $branchId,
                'client_id' => $clientId,
                'created_by' => $createdBy,
                'items' => $items,
                'total' => $this->computeTotal($items),
                'observaciones_generales' => $data['observaciones_generales'] ?? null,
            ]);
        });
    }

    public function update(Budget $budget, array $data): Budget
    {
        $update = array_filter($data, fn ($k) => in_array($k, [
            'items', 'observaciones_generales',
        ]), ARRAY_FILTER_USE_KEY);

        if (array_key_exists('items', $update)) {
            $update['total'] = $this->computeTotal($update['items']);
        }

        $budget->update($update);

        return $budget->fresh();
    }
}
