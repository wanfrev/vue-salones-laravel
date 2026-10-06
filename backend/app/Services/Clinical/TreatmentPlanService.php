<?php

namespace App\Services\Clinical;

use App\Models\Clinical\ClinicalCase;
use App\Models\Clinical\TreatmentPlan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/** Planes terapéuticos: individuales (case_id NULL) y conjuntos (case_id = caso), sin mezclarse. */
class TreatmentPlanService
{
    private const EDITABLE = ['status', 'start_date', 'end_date', 'data'];

    public function listForClient(string $clientId, string $businessId)
    {
        return TreatmentPlan::where('client_id', $clientId)
            ->whereNull('case_id')
            ->where('business_id', $businessId)
            ->orderByDesc('created_at')
            ->get();
    }

    public function findForClient(string $id, string $clientId, string $businessId): ?TreatmentPlan
    {
        return TreatmentPlan::where('id', $id)
            ->where('client_id', $clientId)
            ->whereNull('case_id')
            ->where('business_id', $businessId)
            ->first();
    }

    public function create(string $clientId, string $businessId, ?string $branchId, array $data, ?string $createdBy): TreatmentPlan
    {
        return $this->insert($clientId, null, $businessId, $branchId, $data, $createdBy);
    }

    public function update(TreatmentPlan $plan, array $data): TreatmentPlan
    {
        $plan->update(array_intersect_key($data, array_flip(self::EDITABLE)));

        return $plan->fresh();
    }

    // ── Conjuntos (por caso) ────────────────────────────────────────────────────

    public function listForCase(string $caseId, string $businessId)
    {
        return TreatmentPlan::where('case_id', $caseId)
            ->where('business_id', $businessId)
            ->orderByDesc('created_at')
            ->get();
    }

    public function findForCase(string $id, string $caseId, string $businessId): ?TreatmentPlan
    {
        return TreatmentPlan::where('id', $id)
            ->where('case_id', $caseId)
            ->where('business_id', $businessId)
            ->first();
    }

    public function createForCase(ClinicalCase $case, string $titularId, ?string $branchId, array $data, ?string $createdBy): TreatmentPlan
    {
        return $this->insert($titularId, $case->id, $case->business_id, $branchId, $data, $createdBy);
    }

    /** Planes conjuntos de los casos de los que el paciente es o fue integrante (solo lectura en su ficha). */
    public function jointForClient(string $clientId, string $businessId, int $limit = 50): array
    {
        $caseNames = DB::table('clinical_case_members as m')
            ->join('clinical_cases as c', 'c.id', '=', 'm.case_id')
            ->where('m.business_id', $businessId)
            ->where('m.client_id', $clientId)
            ->pluck('c.name', 'c.id');

        if ($caseNames->isEmpty()) {
            return [];
        }

        return TreatmentPlan::where('business_id', $businessId)
            ->whereIn('case_id', $caseNames->keys())
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->each(fn (TreatmentPlan $p) => $p->setAttribute('case_name', $caseNames[$p->case_id] ?? null))
            ->all();
    }

    private function insert(string $clientId, ?string $caseId, string $businessId, ?string $branchId, array $data, ?string $createdBy): TreatmentPlan
    {
        return DB::transaction(fn () => TreatmentPlan::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'branch_id' => $branchId,
            'client_id' => $clientId,
            'case_id' => $caseId,
            'created_by' => $createdBy,
            'status' => $data['status'] ?? 'active',
            'start_date' => $data['start_date'] ?? null,
            'end_date' => $data['end_date'] ?? null,
            'data' => $data['data'] ?? [],
        ]));
    }
}
