<?php

namespace App\Services\Dental;

use App\Models\Dental\ClinicalHistory;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ClinicalHistoryService
{
    public function listForClient(string $clientId, string $businessId)
    {
        return ClinicalHistory::where('client_id', $clientId)
            ->where('business_id', $businessId)
            ->orderByDesc('folio_number')
            ->get();
    }

    public function findForClient(string $id, string $clientId, string $businessId): ?ClinicalHistory
    {
        return ClinicalHistory::where('id', $id)
            ->where('client_id', $clientId)
            ->where('business_id', $businessId)
            ->first();
    }

    public function create(string $clientId, string $businessId, ?string $branchId, array $data, ?string $createdBy): ClinicalHistory
    {
        return DB::transaction(function () use ($clientId, $businessId, $branchId, $data, $createdBy) {
            $nextFolio = (int) (ClinicalHistory::where('client_id', $clientId)->max('folio_number') ?? 0) + 1;

            return ClinicalHistory::create([
                'id' => Str::uuid()->toString(),
                'business_id' => $businessId,
                'branch_id' => $branchId,
                'client_id' => $clientId,
                'folio_number' => $nextFolio,
                'created_by' => $createdBy,
                'anamnesis' => $data['anamnesis'] ?? [],
                'examen_fisico' => $data['examen_fisico'] ?? [],
                'examenes_complementarios' => $data['examenes_complementarios'] ?? [],
                'diagnostico' => $data['diagnostico'] ?? [],
                'certificado_veracidad' => $data['certificado_veracidad'] ?? false,
                'observaciones_generales' => $data['observaciones_generales'] ?? null,
            ]);
        });
    }

    public function update(ClinicalHistory $history, array $data): ClinicalHistory
    {
        $history->update(array_filter($data, fn ($k) => in_array($k, [
            'anamnesis', 'examen_fisico', 'examenes_complementarios', 'diagnostico',
            'certificado_veracidad', 'observaciones_generales',
        ]), ARRAY_FILTER_USE_KEY));

        return $history->fresh();
    }
}
