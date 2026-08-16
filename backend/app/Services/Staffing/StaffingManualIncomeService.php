<?php

namespace App\Services\Staffing;

use App\Models\StaffingManualIncome;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class StaffingManualIncomeService
{
    public function list(string $businessId, string $from, string $to): Collection
    {
        return StaffingManualIncome::where('business_id', $businessId)
            ->whereBetween('income_date', [$from, $to])
            ->orderByDesc('income_date')
            ->get();
    }

    public function store(array $data, string $businessId, ?string $createdBy = null): StaffingManualIncome
    {
        return StaffingManualIncome::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'income_date' => $data['income_date'],
            'amount' => $data['amount'],
            'notes' => $data['notes'] ?? null,
            'created_by' => $createdBy,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function destroy(string $id, string $businessId): void
    {
        $income = StaffingManualIncome::find($id);
        if (!$income || $income->business_id !== $businessId) {
            throw new NotFoundHttpException('Ingreso no encontrado.');
        }

        $income->delete();
    }
}
