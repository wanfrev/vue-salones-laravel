<?php

namespace App\Http\Controllers\Api\Clinical;

use App\Events\EntityChanged;
use App\Http\Controllers\Api\Clinical\Concerns\ClinicalRecordAccess;
use App\Services\Clinical\TreatmentPlanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TreatmentPlanController
{
    use ClinicalRecordAccess;

    public function __construct(private TreatmentPlanService $service)
    {
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'status' => ['required', 'in:active,paused,completed'],
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'data' => ['required', 'array'],
            'data.approach' => ['nullable', 'string', 'max:255'],
            'data.formulation' => ['nullable', 'string', 'max:20000'],
            'data.frequency' => ['nullable', 'string', 'max:255'],
            'data.notes' => ['nullable', 'string', 'max:20000'],
            'data.goals' => ['nullable', 'array', 'max:50'],
            'data.goals.*.id' => ['required', 'string', 'max:64'],
            'data.goals.*.text' => ['required', 'string', 'max:1000'],
            'data.goals.*.status' => ['required', 'in:pending,in_progress,achieved'],
        ]);
    }

    public function index(Request $request, string $clientId): JsonResponse
    {
        [$businessId, , $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;

        return response()->json($this->service->listForClient($clientId, $businessId));
    }

    public function show(Request $request, string $clientId, string $id): JsonResponse
    {
        [$businessId, , $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;

        $plan = $this->service->findForClient($id, $clientId, $businessId);
        if (!$plan) return response()->json(['message' => 'Plan terapéutico no encontrado.'], 404);

        return response()->json($plan);
    }

    public function store(Request $request, string $clientId): JsonResponse
    {
        [$businessId, $client, $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;

        $plan = $this->service->create($clientId, $businessId, $client->branch_id, $this->validated($request), $request->user()?->id);

        EntityChanged::safe($businessId, 'clinical_treatment_plan', 'created', $plan->id);

        return response()->json($plan, 201);
    }

    public function update(Request $request, string $clientId, string $id): JsonResponse
    {
        [$businessId, , $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;

        $plan = $this->service->findForClient($id, $clientId, $businessId);
        if (!$plan) return response()->json(['message' => 'Plan terapéutico no encontrado.'], 404);

        $plan = $this->service->update($plan, $this->validated($request));

        EntityChanged::safe($businessId, 'clinical_treatment_plan', 'updated', $plan->id);

        return response()->json($plan);
    }
}
