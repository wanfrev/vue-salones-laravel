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

        // estado_override is edited independently of amount (a separate control on the report),
        // so only touch it when the caller actually sent the key — omitting it must not silently
        // reset a previously-set override back to "automático".
        $payload = [
            'amount' => $data['amount'] ?? 0,
            'notes' => $data['notes'] ?? null,
            'updated_at' => now(),
        ];
        if (array_key_exists('estado_override', $data)) {
            $payload['estado_override'] = $data['estado_override'];
        }

        if ($existing) {
            $existing->update($payload);

            return $existing->fresh();
        }

        return StaffingWeeklyExpense::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'company_id' => $data['company_id'],
            'week_start' => $data['week_start'],
            'estado_override' => $data['estado_override'] ?? null,
            'created_by' => $createdBy,
            'created_at' => now(),
            ...$payload,
        ]);
    }
}
