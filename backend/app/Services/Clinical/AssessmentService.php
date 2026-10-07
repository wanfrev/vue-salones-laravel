<?php

namespace App\Services\Clinical;

use App\Models\Clinical\Assessment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AssessmentService
{
    public function listForClient(string $clientId, string $businessId)
    {
        return Assessment::where('client_id', $clientId)
            ->where('business_id', $businessId)
            ->orderByDesc('assessed_at')
            ->get();
    }

    public function create(string $clientId, string $businessId, ?string $branchId, array $data, ?string $createdBy): Assessment
    {
        // Puntaje, severidad y bandera de riesgo SIEMPRE se calculan aquí, no vienen del cliente.
        $scored = AssessmentScoring::score($data['instrument'], $data['answers']);

        return DB::transaction(function () use ($clientId, $businessId, $branchId, $data, $createdBy, $scored) {
            return Assessment::create([
                'id' => Str::uuid()->toString(),
                'business_id' => $businessId,
                'branch_id' => $branchId,
                'client_id' => $clientId,
                'created_by' => $createdBy,
                'instrument' => $data['instrument'],
                'answers' => array_values($data['answers']),
                'total_score' => $scored['total_score'],
                'severity' => $scored['severity'],
                'risk_flag' => $scored['risk_flag'],
                'notes' => $data['notes'] ?? null,
                'assessed_at' => now(),
            ]);
        });
    }
}
