<?php

namespace App\Http\Controllers\Api\Clinical;

use App\Events\EntityChanged;
use App\Http\Controllers\Api\Clinical\Concerns\ClinicalRecordAccess;
use App\Models\Clinical\ClinicalCase;
use App\Services\Clinical\CaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use InvalidArgumentException;

/**
 * Casos clínicos: pareja, familia o grupo en tratamiento conjunto. Mismas reglas de acceso que el
 * resto del expediente. Un caso nunca se borra (se cierra) y vincular/desvincular una cita solo lo
 * hace quien tiene acceso clínico.
 */
class CaseController
{
    use ClinicalRecordAccess;

    public function __construct(private CaseService $service)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['message' => 'No autorizado.'], 403);
        if ($denied = $this->denyUnlessClinicalAccess($request)) return $denied;

        $data = $request->validate(['status' => ['nullable', Rule::in(['active', 'closed'])]]);

        return response()->json($this->service->list($businessId, $data['status'] ?? null));
    }

    /** Buscador de pacientes para integrantes de un caso (ver CaseService::searchPatients). */
    public function searchPatients(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['message' => 'No autorizado.'], 403);
        if ($denied = $this->denyUnlessClinicalAccess($request)) return $denied;

        $data = $request->validate(['q' => ['required', 'string', 'min:1', 'max:80']]);
        $results = $this->service->searchPatients($businessId, $data['q']);

        // Mismo criterio que /clients/search: si el negocio oculta el teléfono a los empleados, no sale.
        if ($this->hidesPhoneFromEmployee($request, $businessId)) {
            $results->each(fn ($c) => $c->phone = '');
        }

        return response()->json($results->values());
    }

    private function hidesPhoneFromEmployee(Request $request, string $businessId): bool
    {
        if ($request->user()?->profile?->role !== 'empleado') return false;
        $features = \App\Models\Business::find($businessId)?->features;
        $features = is_array($features) ? $features : (json_decode($features ?? '[]', true) ?: []);

        return (bool) ($features['hide_client_phone_from_employees'] ?? false);
    }

    public function show(Request $request, string $caseId): JsonResponse
    {
        [, $case, $error] = $this->resolveCaseContext($request, $caseId);
        if ($error) return $error;

        $this->auditCase($request, $case, 'viewed');

        return response()->json($this->service->show($case));
    }

    public function store(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['message' => 'No autorizado.'], 403);
        if ($denied = $this->denyUnlessClinicalAccess($request)) return $denied;

        $data = $request->validate([
            'type' => ['required', Rule::in(ClinicalCase::TYPES)],
            'name' => ['required', 'string', 'max:150'],
            'opened_on' => ['nullable', 'date_format:Y-m-d'],
            'primary_client_id' => ['nullable', 'uuid'],
            'members' => ['required', 'array', 'min:2', 'max:30'],
            'members.*.client_id' => ['required', 'uuid', 'distinct'],
            'members.*.role' => ['nullable', 'string', 'max:60'],
        ]);

        try {
            $case = $this->service->create($businessId, null, $data, $request->user()?->id);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        EntityChanged::safe($businessId, 'clinical_case', 'created', $case->id);
        $this->auditCase($request, $case, 'created');

        return response()->json($this->service->show($case), 201);
    }

    public function update(Request $request, string $caseId): JsonResponse
    {
        [$businessId, $case, $error] = $this->resolveCaseContext($request, $caseId);
        if ($error) return $error;

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:150'],
            'status' => ['sometimes', Rule::in(['active', 'closed'])],
            'opened_on' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'primary_client_id' => ['sometimes', 'uuid'],
        ]);

        try {
            $case = $this->service->update($case, $data);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        EntityChanged::safe($businessId, 'clinical_case', 'updated', $case->id);
        $this->auditCase($request, $case, 'updated');

        return response()->json($this->service->show($case));
    }

    public function addMember(Request $request, string $caseId): JsonResponse
    {
        [$businessId, $case, $error] = $this->resolveCaseContext($request, $caseId);
        if ($error) return $error;

        $data = $request->validate([
            'client_id' => ['required', 'uuid'],
            'role' => ['nullable', 'string', 'max:60'],
        ]);

        try {
            $this->service->addMember($case, $data['client_id'], $data['role'] ?? null);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        EntityChanged::safe($businessId, 'clinical_case', 'updated', $case->id);
        $this->auditCase($request, $case, 'updated', 'case', null, 'member_added');

        return response()->json($this->service->show($case), 201);
    }

    public function removeMember(Request $request, string $caseId, string $clientId): JsonResponse
    {
        [$businessId, $case, $error] = $this->resolveCaseContext($request, $caseId);
        if ($error) return $error;

        try {
            $this->service->removeMember($case, $clientId);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        EntityChanged::safe($businessId, 'clinical_case', 'updated', $case->id);
        $this->auditCase($request, $case, 'updated', 'case', null, 'member_removed');

        return response()->json($this->service->show($case));
    }

    /** Casos del paciente (para su ficha y para vincular una cita). */
    public function forClient(Request $request, string $clientId): JsonResponse
    {
        [$businessId, , $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;

        return response()->json($this->service->forClient($clientId, $businessId));
    }

    // ── Citas ───────────────────────────────────────────────────────────────────

    public function linkAppointment(Request $request, string $caseId, string $appointmentId): JsonResponse
    {
        [$businessId, $case, $error] = $this->resolveCaseContext($request, $caseId);
        if ($error) return $error;

        try {
            $this->service->linkAppointment($case, $appointmentId, $request->user()?->id);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        EntityChanged::safe($businessId, 'appointment', 'updated', $appointmentId);
        $this->auditCase($request, $case, 'updated', 'case', null, 'appointment_linked');

        return response()->json(['ok' => true]);
    }

    public function unlinkAppointment(Request $request, string $caseId, string $appointmentId): JsonResponse
    {
        [$businessId, $case, $error] = $this->resolveCaseContext($request, $caseId);
        if ($error) return $error;

        $this->service->unlinkAppointment($appointmentId, $businessId);

        EntityChanged::safe($businessId, 'appointment', 'updated', $appointmentId);
        $this->auditCase($request, $case, 'updated', 'case', null, 'appointment_unlinked');

        return response()->json(['ok' => true]);
    }

    /** ¿A qué caso está vinculada esta cita? (204 si a ninguno.) */
    public function forAppointment(Request $request, string $appointmentId)
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['message' => 'No autorizado.'], 403);
        if ($denied = $this->denyUnlessClinicalAccess($request)) return $denied;

        $case = $this->service->caseForAppointment($appointmentId, $businessId);

        return $case ? response()->json($case) : response()->noContent();
    }
}
