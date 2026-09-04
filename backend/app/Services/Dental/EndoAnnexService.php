<?php

namespace App\Services\Dental;

use App\Models\Dental\EndoAnnex;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class EndoAnnexService
{
    public function listForClient(string $clientId, string $businessId)
    {
        return EndoAnnex::where('client_id', $clientId)
            ->where('business_id', $businessId)
            ->orderByDesc('created_at')
            ->get();
    }

    public function findForClient(string $id, string $clientId, string $businessId): ?EndoAnnex
    {
        return EndoAnnex::where('id', $id)
            ->where('client_id', $clientId)
            ->where('business_id', $businessId)
            ->first();
    }

    public function create(string $clientId, string $businessId, ?string $branchId, array $data, ?string $createdBy): EndoAnnex
    {
        $toothNumber = (int) ($data['tooth_number'] ?? 0);
        if (!in_array($toothNumber, DentalChartService::VALID_TEETH, true)) {
            throw ValidationException::withMessages(['tooth_number' => "Pieza dental inválida: {$toothNumber}"]);
        }

        return DB::transaction(function () use ($clientId, $businessId, $branchId, $toothNumber, $data, $createdBy) {
            return EndoAnnex::create([
                'id' => Str::uuid()->toString(),
                'business_id' => $businessId,
                'branch_id' => $branchId,
                'client_id' => $clientId,
                'tooth_number' => $toothNumber,
                'created_by' => $createdBy,
                'examen' => $data['examen'] ?? [],
                'diagnostico' => $data['diagnostico'] ?? [],
                'tratamiento' => $data['tratamiento'] ?? [],
            ]);
        });
    }

    public function update(EndoAnnex $annex, array $data): EndoAnnex
    {
        $annex->update(array_filter($data, fn ($k) => in_array($k, [
            'examen', 'diagnostico', 'tratamiento',
        ]), ARRAY_FILTER_USE_KEY));

        return $annex->fresh();
    }
}
