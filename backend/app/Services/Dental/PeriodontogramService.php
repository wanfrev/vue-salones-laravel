<?php

namespace App\Services\Dental;

use App\Models\Dental\Periodontogram;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PeriodontogramService
{
    public function listForClient(string $clientId, string $businessId)
    {
        return Periodontogram::where('client_id', $clientId)
            ->where('business_id', $businessId)
            ->orderByDesc('created_at')
            ->get();
    }

    public function findForClient(string $id, string $clientId, string $businessId): ?Periodontogram
    {
        return Periodontogram::where('id', $id)
            ->where('client_id', $clientId)
            ->where('business_id', $businessId)
            ->first();
    }

    public function create(string $clientId, string $businessId, ?string $branchId, array $data, ?string $createdBy): Periodontogram
    {
        return DB::transaction(function () use ($clientId, $businessId, $branchId, $data, $createdBy) {
            return Periodontogram::create([
                'id' => Str::uuid()->toString(),
                'business_id' => $businessId,
                'branch_id' => $branchId,
                'client_id' => $clientId,
                'created_by' => $createdBy,
                'teeth' => $data['teeth'] ?? [],
                'observaciones_generales' => $data['observaciones_generales'] ?? null,
            ]);
        });
    }

    public function update(Periodontogram $periodontogram, array $data): Periodontogram
    {
        $periodontogram->update(array_filter($data, fn ($k) => in_array($k, [
            'teeth', 'observaciones_generales',
        ]), ARRAY_FILTER_USE_KEY));

        return $periodontogram->fresh();
    }
}
