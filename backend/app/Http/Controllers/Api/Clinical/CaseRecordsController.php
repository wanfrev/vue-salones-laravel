<?php

namespace App\Http\Controllers\Api\Clinical;

use App\Events\EntityChanged;
use App\Http\Controllers\Api\Clinical\Concerns\ClinicalRecordAccess;
use App\Services\Clinical\CaseService;
use App\Services\Clinical\SessionNoteService;
use App\Services\Clinical\TreatmentPlanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Notas de sesión y planes terapéuticos CONJUNTOS de un caso (pareja/familia/grupo), y sus vistas
 * de solo lectura en la ficha de cada integrante. Lo individual vive en SessionNoteController /
 * TreatmentPlanController y nunca se mezcla con esto.
 */
class CaseRecordsController
{
    use ClinicalRecordAccess;

    public function __construct(
        private SessionNoteService $notes,
        private TreatmentPlanService $plans,
        private CaseService $cases,
    ) {
    }

    // ── Notas conjuntas ─────────────────────────────────────────────────────────

    public function notesIndex(Request $request, string $caseId): JsonResponse
    {
        [$businessId, $case, $error] = $this->resolveCaseContext($request, $caseId);
        if ($error) return $error;

        $this->auditCase($request, $case, 'viewed', 'session_note');

        return response()->json($this->notes->listForCase($caseId, $businessId));
    }

    public function appointments(Request $request, string $caseId): JsonResponse
    {
        [$businessId, , $error] = $this->resolveCaseContext($request, $caseId);
        if ($error) return $error;

        return response()->json($this->notes->recentCaseAppointments($caseId, $businessId));
    }

    public function notesStore(Request $request, string $caseId): JsonResponse
    {
        [$businessId, $case, $error] = $this->resolveCaseContext($request, $caseId);
        if ($error) return $error;

        $data = SessionNoteController::clean($request->validate(SessionNoteController::rules()));

        // La nota conjunta cuelga del titular del caso (client_id) — sin titular activo no hay dónde anclarla.
        $titular = $this->cases->titular($case);
        if (!$titular) {
            return response()->json(['message' => 'El caso no tiene un titular activo.'], 422);
        }
        if (!$this->notes->appointmentLinkedToCase($data['appointment_id'] ?? null, $caseId)) {
            return response()->json(['message' => 'La cita seleccionada no está vinculada a este caso.'], 422);
        }

        $note = $this->notes->createForCase($case, $titular, $case->branch_id, $data, $request->user()?->id);

        EntityChanged::safe($businessId, 'clinical_session_note', 'created', $note->id);
        $this->auditCase($request, $case, 'created', 'session_note', $note->id);

        return response()->json($note, 201);
    }

    public function notesUpdate(Request $request, string $caseId, string $id): JsonResponse
    {
        [$businessId, $case, $error] = $this->resolveCaseContext($request, $caseId);
        if ($error) return $error;

        $note = $this->notes->findForCase($id, $caseId, $businessId);
        if (!$note) return response()->json(['message' => 'Nota de sesión no encontrada.'], 404);

        if (!$this->canModify($request, $note->created_by)) {
            return response()->json(['message' => 'Solo el autor de la nota puede editarla.'], 403);
        }

        $data = SessionNoteController::clean($request->validate(SessionNoteController::rules()));

        if (!$this->notes->appointmentLinkedToCase($data['appointment_id'] ?? null, $caseId)) {
            return response()->json(['message' => 'La cita seleccionada no está vinculada a este caso.'], 422);
        }

        $note = $this->notes->update($note, $data);

        EntityChanged::safe($businessId, 'clinical_session_note', 'updated', $note->id);
        $this->auditCase($request, $case, 'updated', 'session_note', $note->id);

        return response()->json($note);
    }

    // ── Planes conjuntos ────────────────────────────────────────────────────────

    public function plansIndex(Request $request, string $caseId): JsonResponse
    {
        [$businessId, $case, $error] = $this->resolveCaseContext($request, $caseId);
        if ($error) return $error;

        $this->auditCase($request, $case, 'viewed', 'treatment_plan');

        return response()->json($this->plans->listForCase($caseId, $businessId));
    }

    public function plansStore(Request $request, string $caseId): JsonResponse
    {
        [$businessId, $case, $error] = $this->resolveCaseContext($request, $caseId);
        if ($error) return $error;

        $titular = $this->cases->titular($case);
        if (!$titular) {
            return response()->json(['message' => 'El caso no tiene un titular activo.'], 422);
        }

        $plan = $this->plans->createForCase($case, $titular, $case->branch_id, $request->validate(TreatmentPlanController::rules()), $request->user()?->id);

        EntityChanged::safe($businessId, 'clinical_treatment_plan', 'created', $plan->id);
        $this->auditCase($request, $case, 'created', 'treatment_plan', $plan->id);

        return response()->json($plan, 201);
    }

    public function plansUpdate(Request $request, string $caseId, string $id): JsonResponse
    {
        [$businessId, $case, $error] = $this->resolveCaseContext($request, $caseId);
        if ($error) return $error;

        $plan = $this->plans->findForCase($id, $caseId, $businessId);
        if (!$plan) return response()->json(['message' => 'Plan terapéutico no encontrado.'], 404);

        $plan = $this->plans->update($plan, $request->validate(TreatmentPlanController::rules()));

        EntityChanged::safe($businessId, 'clinical_treatment_plan', 'updated', $plan->id);
        $this->auditCase($request, $case, 'updated', 'treatment_plan', $plan->id);

        return response()->json($plan);
    }

    // ── Lo conjunto, visto desde la ficha de un integrante (solo lectura) ───────

    public function jointNotesForClient(Request $request, string $clientId): JsonResponse
    {
        [$businessId, , $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;

        $this->audit($request, $businessId, $clientId, 'viewed', 'session_note', null, 'joint');

        return response()->json($this->notes->jointForClient($clientId, $businessId));
    }

    public function jointPlansForClient(Request $request, string $clientId): JsonResponse
    {
        [$businessId, , $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;

        $this->audit($request, $businessId, $clientId, 'viewed', 'treatment_plan', null, 'joint');

        return response()->json($this->plans->jointForClient($clientId, $businessId));
    }
}
