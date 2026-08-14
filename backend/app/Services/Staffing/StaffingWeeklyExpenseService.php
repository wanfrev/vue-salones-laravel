<?php

namespace App\Services\Staffing;

use App\Models\StaffingWeeklyExpense;
use Illuminate\Support\Str;

/** Upserts "otros gastos" by (company, week) — the weekly report's only free-entry field. */
class StaffingWeeklyExpenseService
{
    public function upsert(array $data, string $businessId, ?string $createdBy = null): StaffingWeeklyExpense
    {
        $existing = StaffingWeeklyExpense::where('business_id', $businessId)
            ->where('company_id', $data['company_id'])
            ->where('week_start', $data['week_start'])
            ->first();

        if ($existing) {
            $existing->update([
                'amount' => $data['amount'] ?? 0,
                'notes' => $data['notes'] ?? null,
                'updated_at' => now(),
            ]);

            return $existing->fresh();
        }

        return StaffingWeeklyExpense::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'company_id' => $data['company_id'],
            'week_start' => $data['week_start'],
            'amount' => $data['amount'] ?? 0,
            'notes' => $data['notes'] ?? null,
            'created_by' => $createdBy,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
