<?php

namespace App\Services\Clinical;

use App\Models\Clinical\TreatmentPlan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TreatmentPlanService
{
    private const EDITABLE = ['status', 'start_date', 'end_date', 'data'];

    public function listForClient(string $clientId, string $businessId)
    {
        return TreatmentPlan::where('client_id', $clientId)
            ->where('business_id', $businessId)
            ->orderByDesc('created_at')
            ->get();
    }

    public function findForClient(string $id, string $clientId, string $businessId): ?TreatmentPlan
    {
        return TreatmentPlan::where('id', $id)
            ->where('client_id', $clientId)
            ->where('business_id', $businessId)
            ->first();
    }

    public function create(string $clientId, string $businessId, ?string $branchId, array $data, ?string $createdBy): TreatmentPlan
    {
        return DB::transaction(function () use ($clientId, $businessId, $branchId, $data, $createdBy) {
            return TreatmentPlan::create([
                'id' => Str::uuid()->toString(),
                'business_id' => $businessId,
                'branch_id' => $branchId,
                'client_id' => $clientId,
                'created_by' => $createdBy,
                'status' => $data['status'] ?? 'active',
                'start_date' => $data['start_date'] ?? null,
                'end_date' => $data['end_date'] ?? null,
                'data' => $data['data'] ?? [],
            ]);
        });
    }

    public function update(TreatmentPlan $plan, array $data): TreatmentPlan
    {
        $plan->update(array_intersect_key($data, array_flip(self::EDITABLE)));

        return $plan->fresh();
    }
}
