<?php

namespace App\Http\Controllers\Api\Clinical;

use App\Events\EntityChanged;
use App\Http\Controllers\Api\Clinical\Concerns\ClinicalRecordAccess;
use App\Services\Clinical\EnrollmentService;
use App\Services\Clinical\ProgramService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

/**
 * Programas de sesiones (catálogo) e inscripciones de pacientes. A diferencia del resto del módulo
 * clínico NO exige el permiso de expediente: inscribir y cobrar un programa es trabajo de recepción y
 * aquí no se lee ni se escribe contenido clínico. Lo que cambia el catálogo o reparte/cancela lo ya
 * vendido (crear/editar programas, extender, forzar el conteo de una sesión, cancelar) es solo de administración.
 */
class ProgramController
{
    use ClinicalRecordAccess;

    public function __construct(private ProgramService $programs, private EnrollmentService $enrollments)
    {
    }

    // ── Catálogo ────────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId || !$request->user()?->profile) return response()->json(['message' => 'No autorizado.'], 403);

        return response()->json($this->programs->list($businessId, $request->boolean('active')));
    }

    public function store(Request $request): JsonResponse
    {
        [$businessId, $error] = $this->adminContext($request);
        if ($error) return $error;

        $data = $request->validate($this->programRules());

        try {
            $program = $this->programs->create($businessId, $request->user()?->id, $data);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        EntityChanged::safe($businessId, 'clinical_program', 'created', $program->id);

        return response()->json($this->programs->show($program), 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        [$businessId, $error] = $this->adminContext($request);
        if ($error) return $error;

        $program = $this->programs->find($id, $businessId);
        if (!$program) return response()->json(['message' => 'Programa no encontrado.'], 404);

        $data = $request->validate($this->programRules(partial: true));

        try {
            $program = $this->programs->update($program, $data);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        EntityChanged::safe($businessId, 'clinical_program', 'updated', $program->id);

        return response()->json($this->programs->show($program));
    }

    private function programRules(bool $partial = false): array
    {
        $req = $partial ? 'sometimes' : 'required';

        return [
            'name' => [$req, 'string', 'min:2', 'max:120'],
            'price' => [$req, 'numeric', 'min:0', 'max:1000000'],
            'validity_days' => ['sometimes', 'integer', 'min:1', 'max:730'],
            'active' => ['sometimes', 'boolean'],
            'components' => [$req, 'array', 'min:1', 'max:' . ProgramService::MAX_COMPONENTS],
            'components.*.service_ids' => ['required', 'array', 'min:1', 'max:' . ProgramService::MAX_SERVICES_PER_COMPONENT],
            'components.*.service_ids.*' => ['uuid'],
            'components.*.quantity' => ['required', 'integer', 'min:1', 'max:' . ProgramService::MAX_SESSIONS],
        ];
    }

    // ── Inscripciones ───────────────────────────────────────────────────────────

    public function forClient(Request $request, string $clientId): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId || !$request->user()?->profile) return response()->json(['message' => 'No autorizado.'], 403);
        if (!$this->findClient($clientId, $businessId)) return response()->json(['message' => 'Paciente no encontrado.'], 404);

        return response()->json($this->enrollments->forClient($clientId, $businessId));
    }

    public function enroll(Request $request, string $clientId): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId || !$request->user()?->profile) return response()->json(['message' => 'No autorizado.'], 403);

        $client = $this->findClient($clientId, $businessId);
        if (!$client) return response()->json(['message' => 'Paciente no encontrado.'], 404);

        $data = $request->validate([
            'program_id' => ['required', 'uuid'],
            'employee_id' => ['required', 'uuid'],
            'branch_id' => ['nullable', 'uuid'],
            'starts_on' => ['nullable', 'date_format:Y-m-d'],
            'sessions' => ['required', 'array', 'min:1', 'max:' . ProgramService::MAX_SESSIONS],
            'sessions.*.service_id' => ['required', 'uuid'],
            'sessions.*.start_time' => ['required', 'date'],
        ]);

        $program = $this->programs->find($data['program_id'], $businessId);
        if (!$program) return response()->json(['message' => 'Programa no encontrado.'], 404);

        try {
            $enrollment = $this->enrollments->enroll(
                $businessId, $client, $program, $data['employee_id'], $data['sessions'],
                $data['branch_id'] ?? null, $request->user()?->id, $data['starts_on'] ?? null,
            );
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        EntityChanged::safe($businessId, 'clinical_enrollment', 'created', $enrollment->id);
        EntityChanged::safe($businessId, 'appointment', 'created', $enrollment->id);

        return response()->json($this->enrollments->show($enrollment), 201);
    }

    public function updateEnrollment(Request $request, string $id): JsonResponse
    {
        [$businessId, $enrollment, $error] = $this->enrollmentContext($request, $id);
        if ($error) return $error;

        $data = $request->validate(['expires_on' => ['required', 'date_format:Y-m-d']]);

        try {
            $enrollment = $this->enrollments->extend($enrollment, $data['expires_on']);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        EntityChanged::safe($businessId, 'clinical_enrollment', 'updated', $enrollment->id);

        return response()->json($this->enrollments->show($enrollment));
    }

    public function cancelEnrollment(Request $request, string $id): JsonResponse
    {
        [$businessId, $enrollment, $error] = $this->enrollmentContext($request, $id);
        if ($error) return $error;

        try {
            $this->enrollments->cancel($enrollment);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        EntityChanged::safe($businessId, 'clinical_enrollment', 'updated', $enrollment->id);
        EntityChanged::safe($businessId, 'appointment', 'deleted', $enrollment->id);

        return response()->json($this->enrollments->show($enrollment->fresh()));
    }

    public function setSessionConsumes(Request $request, string $id, string $appointmentId): JsonResponse
    {
        [$businessId, $enrollment, $error] = $this->enrollmentContext($request, $id);
        if ($error) return $error;

        $data = $request->validate(['consumes' => ['present', 'nullable', 'boolean']]);

        try {
            $this->enrollments->setConsumes($enrollment, $appointmentId, $data['consumes']);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        EntityChanged::safe($businessId, 'clinical_enrollment', 'updated', $enrollment->id);

        return response()->json($this->enrollments->show($enrollment));
    }

    /** ¿De qué programa es esta cita y qué número de sesión es? 204 si no es de ninguno. */
    public function forAppointment(Request $request, string $appointmentId)
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId || !$request->user()?->profile) return response()->json(['message' => 'No autorizado.'], 403);

        $info = $this->enrollments->forAppointment($appointmentId, $businessId);

        return $info ? response()->json($info) : response()->noContent();
    }

    // ── Comunes ─────────────────────────────────────────────────────────────────

    /** @return array{0: ?string, 1: ?JsonResponse} */
    private function adminContext(Request $request): array
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId || !$request->user()?->profile) {
            return [null, response()->json(['message' => 'No autorizado.'], 403)];
        }
        if (!$this->isAdminRole($request)) {
            return [null, response()->json(['message' => 'Solo la administración puede hacer esto.'], 403)];
        }

        return [$businessId, null];
    }

    /** @return array{0: ?string, 1: ?\App\Models\Clinical\Enrollment, 2: ?JsonResponse} */
    private function enrollmentContext(Request $request, string $id): array
    {
        [$businessId, $error] = $this->adminContext($request);
        if ($error) return [null, null, $error];

        $enrollment = $this->enrollments->find($id, $businessId);
        if (!$enrollment) return [null, null, response()->json(['message' => 'Inscripción no encontrada.'], 404)];

        return [$businessId, $enrollment, null];
    }
}
