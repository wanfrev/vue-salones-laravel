<?php

namespace App\Services\Dental;

use App\Models\Dental\PerioAnnex;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PerioAnnexService
{
    public function listForClient(string $clientId, string $businessId)
    {
        return PerioAnnex::where('client_id', $clientId)
            ->where('business_id', $businessId)
            ->orderByDesc('created_at')
            ->get();
    }

    public function findForClient(string $id, string $clientId, string $businessId): ?PerioAnnex
    {
        return PerioAnnex::where('id', $id)
            ->where('client_id', $clientId)
            ->where('business_id', $businessId)
            ->first();
    }

    public function create(string $clientId, string $businessId, ?string $branchId, array $data, ?string $createdBy): PerioAnnex
    {
        return DB::transaction(function () use ($clientId, $businessId, $branchId, $data, $createdBy) {
            return PerioAnnex::create([
                'id' => Str::uuid()->toString(),
                'business_id' => $businessId,
                'branch_id' => $branchId,
                'client_id' => $clientId,
                'created_by' => $createdBy,
                'condiciones_clinicas' => $data['condiciones_clinicas'] ?? [],
                'factores_riesgo' => $data['factores_riesgo'] ?? [],
                'diagnostico' => $data['diagnostico'] ?? [],
                'observaciones_generales' => $data['observaciones_generales'] ?? null,
            ]);
        });
    }

    public function update(PerioAnnex $annex, array $data): PerioAnnex
    {
        $annex->update(array_filter($data, fn ($k) => in_array($k, [
            'condiciones_clinicas', 'factores_riesgo', 'diagnostico', 'observaciones_generales',
        ]), ARRAY_FILTER_USE_KEY));

        return $annex->fresh();
    }
}
