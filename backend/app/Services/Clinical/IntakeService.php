<?php

namespace App\Services\Clinical;

use App\Models\Clinical\Intake;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class IntakeService
{
    public function findForClient(string $clientId, string $businessId): ?Intake
    {
        return Intake::where('client_id', $clientId)
            ->where('business_id', $businessId)
            ->first();
    }

    /** Crea la historia del paciente o actualiza la existente (una viva por paciente). */
    public function upsert(string $clientId, string $businessId, ?string $branchId, array $data, ?string $userId): Intake
    {
        return DB::transaction(function () use ($clientId, $businessId, $branchId, $data, $userId) {
            $intake = Intake::where('client_id', $clientId)
                ->where('business_id', $businessId)
                ->lockForUpdate()
                ->first();

            if ($intake) {
                $intake->update(['data' => $data, 'updated_by' => $userId]);

                return $intake->fresh();
            }

            return Intake::create([
                'id' => Str::uuid()->toString(),
                'business_id' => $businessId,
                'branch_id' => $branchId,
                'client_id' => $clientId,
                'created_by' => $userId,
                'updated_by' => $userId,
                'data' => $data,
            ]);
        });
    }
}
