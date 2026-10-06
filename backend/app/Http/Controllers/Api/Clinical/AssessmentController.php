<?php

namespace App\Http\Controllers\Api\Clinical;

use App\Events\EntityChanged;
use App\Http\Controllers\Api\Clinical\Concerns\ClinicalRecordAccess;
use App\Services\Clinical\AssessmentScoring;
use App\Services\Clinical\AssessmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Cuestionarios estandarizados (PHQ-9, GAD-7) — solo lectura y alta; el puntaje lo calcula el servidor. */
class AssessmentController
{
    use ClinicalRecordAccess;

    public function __construct(private AssessmentService $service)
    {
    }

    public function index(Request $request, string $clientId): JsonResponse
    {
        [$businessId, , $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;

        $this->audit($request, $businessId, $clientId, 'viewed', 'assessment');

        return response()->json($this->service->listForClient($clientId, $businessId));
    }

    public function store(Request $request, string $clientId): JsonResponse
    {
        [$businessId, $client, $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;

        $data = $request->validate([
            'instrument' => ['required', Rule::in(AssessmentScoring::instruments())],
            'answers' => ['required', 'array'],
            'answers.*' => ['required', 'integer', 'min:0', 'max:3'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        if (count($data['answers']) !== AssessmentScoring::itemCount($data['instrument'])) {
            return response()->json(['message' => 'El cuestionario está incompleto.'], 422);
        }

        $data['answers'] = array_map('intval', array_values($data['answers']));

        $assessment = $this->service->create($clientId, $businessId, $client->branch_id, $data, $request->user()?->id);

        EntityChanged::safe($businessId, 'clinical_assessment', 'created', $assessment->id);
        $this->audit($request, $businessId, $clientId, 'created', 'assessment', $assessment->id);

        return response()->json($assessment, 201);
    }
}
