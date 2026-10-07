<?php

namespace App\Services\Clinical;

use App\Models\Clinical\InformedConsent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class InformedConsentService
{
    public function listForClient(string $clientId, string $businessId)
    {
        return InformedConsent::where('client_id', $clientId)
            ->where('business_id', $businessId)
            ->orderByDesc('signed_at')
            ->get();
    }

    public function findForClient(string $id, string $clientId, string $businessId): ?InformedConsent
    {
        return InformedConsent::where('id', $id)
            ->where('client_id', $clientId)
            ->where('business_id', $businessId)
            ->first();
    }

    public function create(string $clientId, string $businessId, ?string $branchId, array $data, ?string $createdBy): InformedConsent
    {
        return DB::transaction(function () use ($clientId, $businessId, $branchId, $data, $createdBy) {
            return InformedConsent::create([
                'id' => Str::uuid()->toString(),
                'business_id' => $businessId,
                'branch_id' => $branchId,
                'client_id' => $clientId,
                'created_by' => $createdBy,
                'title' => $data['title'],
                'content' => $data['content'],
                'signature_data' => $data['signature_data'],
                'signer_name' => $data['signer_name'] ?? null,
                'signer_relationship' => $data['signer_relationship'] ?? null,
                'signed_at' => now(),
            ]);
        });
    }
}
