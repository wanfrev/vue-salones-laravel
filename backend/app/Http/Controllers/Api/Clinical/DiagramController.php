<?php

namespace App\Http\Controllers\Api\Clinical;

use App\Events\EntityChanged;
use App\Http\Controllers\Api\Clinical\Concerns\ClinicalRecordAccess;
use App\Models\Clinical\Diagram;
use App\Services\Clinical\DiagramService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

/**
 * Genograma y línea de vida, de un paciente (`/clients/{id}/diagrams/{type}`) o de un caso
 * (`/clinical-cases/{id}/diagrams/{type}`). Uno vivo por (dueño, tipo): PUT crea o reemplaza.
 * GET devuelve 204 si todavía no existe (no `{}`, que parecería un diagrama vacío).
 */
class DiagramController
{
    use ClinicalRecordAccess;

    public function __construct(private DiagramService $service)
    {
    }

    private function dataRules(string $type): array
    {
        return $type === 'genogram'
            ? [
                'data' => ['required', 'array'],
                'data.nodes' => ['present', 'array', 'max:' . DiagramService::MAX_NODES],
                'data.nodes.*.id' => ['required', 'string', 'max:64', 'distinct'],
                'data.nodes.*.x' => ['required', 'numeric', 'between:-100000,100000'],
                'data.nodes.*.y' => ['required', 'numeric', 'between:-100000,100000'],
                'data.nodes.*.kind' => ['required', Rule::in(DiagramService::GENOGRAM_KINDS)],
                'data.nodes.*.name' => ['nullable', 'string', 'max:100'],
                'data.nodes.*.age' => ['nullable', 'string', 'max:20'],
                'data.nodes.*.deceased' => ['nullable', 'boolean'],
                'data.nodes.*.index' => ['nullable', 'boolean'],
                'data.nodes.*.notes' => ['nullable', 'string', 'max:500'],
                'data.edges' => ['present', 'array', 'max:' . DiagramService::MAX_EDGES],
                'data.edges.*.id' => ['required', 'string', 'max:64', 'distinct'],
                'data.edges.*.source' => ['required', 'string', 'max:64'],
                'data.edges.*.target' => ['required', 'string', 'max:64'],
                'data.edges.*.kind' => ['required', Rule::in(DiagramService::EDGE_KINDS)],
            ]
            : [
                'data' => ['required', 'array'],
                'data.events' => ['present', 'array', 'max:' . DiagramService::MAX_EVENTS],
                'data.events.*.id' => ['required', 'string', 'max:64', 'distinct'],
                'data.events.*.year' => ['required', 'integer', 'between:1900,2100'],
                'data.events.*.age' => ['nullable', 'integer', 'between:0,120'],
                'data.events.*.title' => ['required', 'string', 'max:150'],
                'data.events.*.valence' => ['required', 'integer', 'between:-2,2'],
                'data.events.*.note' => ['nullable', 'string', 'max:1000'],
            ];
    }

    // ── Del paciente ────────────────────────────────────────────────────────────

    public function showForClient(Request $request, string $clientId, string $type): JsonResponse|Response
    {
        [$businessId, , $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;
        if (!in_array($type, Diagram::TYPES, true)) return response()->json(['message' => 'Tipo de diagrama inválido.'], 404);

        $diagram = $this->service->find(['client_id' => $clientId], $type, $businessId);
        if ($diagram) {
            $this->audit($request, $businessId, $clientId, 'viewed', 'diagram', $diagram->id, $type);
        }

        return $diagram ? response()->json($diagram) : response()->noContent();
    }

    public function saveForClient(Request $request, string $clientId, string $type): JsonResponse
    {
        [$businessId, $client, $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;
        if (!in_array($type, Diagram::TYPES, true)) return response()->json(['message' => 'Tipo de diagrama inválido.'], 404);

        $data = $request->validate($this->dataRules($type));
        $existed = $this->service->find(['client_id' => $clientId], $type, $businessId) !== null;
        $diagram = $this->service->upsert(['client_id' => $clientId], $type, $data['data'], $businessId, $client->branch_id, $request->user()?->id);

        EntityChanged::safe($businessId, 'clinical_diagram', $existed ? 'updated' : 'created', $diagram->id);
        $this->audit($request, $businessId, $clientId, $existed ? 'updated' : 'created', 'diagram', $diagram->id, $type);

        return response()->json($diagram, $existed ? 200 : 201);
    }

    // ── Del caso ────────────────────────────────────────────────────────────────

    public function showForCase(Request $request, string $caseId, string $type): JsonResponse|Response
    {
        [$businessId, $case, $error] = $this->resolveCaseContext($request, $caseId);
        if ($error) return $error;
        if (!in_array($type, Diagram::TYPES, true)) return response()->json(['message' => 'Tipo de diagrama inválido.'], 404);

        $diagram = $this->service->find(['case_id' => $caseId], $type, $businessId);
        if ($diagram) {
            $this->auditCase($request, $case, 'viewed', 'diagram', $diagram->id, $type);
        }

        return $diagram ? response()->json($diagram) : response()->noContent();
    }

    public function saveForCase(Request $request, string $caseId, string $type): JsonResponse
    {
        [$businessId, $case, $error] = $this->resolveCaseContext($request, $caseId);
        if ($error) return $error;
        if (!in_array($type, Diagram::TYPES, true)) return response()->json(['message' => 'Tipo de diagrama inválido.'], 404);

        $data = $request->validate($this->dataRules($type));
        $existed = $this->service->find(['case_id' => $caseId], $type, $businessId) !== null;
        $diagram = $this->service->upsert(['case_id' => $caseId], $type, $data['data'], $businessId, $case->branch_id, $request->user()?->id);

        EntityChanged::safe($businessId, 'clinical_diagram', $existed ? 'updated' : 'created', $diagram->id);
        $this->auditCase($request, $case, $existed ? 'updated' : 'created', 'diagram', $diagram->id, $type);

        return response()->json($diagram, $existed ? 200 : 201);
    }
}
