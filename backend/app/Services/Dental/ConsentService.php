<?php

namespace App\Services\Dental;

use App\Models\Dental\Consent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ConsentService
{
    public function listForClient(string $clientId, string $businessId)
    {
        return Consent::where('client_id', $clientId)
            ->where('business_id', $businessId)
            ->orderByDesc('signed_at')
            ->get();
    }

    public function findForClient(string $id, string $clientId, string $businessId): ?Consent
    {
        return Consent::where('id', $id)
            ->where('client_id', $clientId)
            ->where('business_id', $businessId)
            ->first();
    }

    public function create(string $clientId, string $businessId, ?string $branchId, array $data, ?string $createdBy): Consent
    {
        return DB::transaction(function () use ($clientId, $businessId, $branchId, $data, $createdBy) {
            return Consent::create([
                'id' => Str::uuid()->toString(),
                'business_id' => $businessId,
                'branch_id' => $branchId,
                'client_id' => $clientId,
                'created_by' => $createdBy,
                'procedure_description' => $data['procedure_description'],
                'risks_text' => $data['risks_text'],
                'signature_data' => $data['signature_data'],
                'signed_at' => now(),
            ]);
        });
    }
}
