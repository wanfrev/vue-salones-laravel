<?php

namespace App\Http\Controllers\Api\Clinical\Concerns;

use App\Models\Client;
use App\Models\Clinical\ClinicalCase;
use App\Services\Clinical\CaseService;
use App\Services\Clinical\ClinicalAuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Piezas comunes de los controllers del módulo clínico (psicología y futuras verticales de salud
 * mental). A diferencia de los controllers dentales — cuyo permiso `can_access_dental_clinical`
 * solo lo valida el frontend — aquí el acceso se IMPONE en el servidor: estos datos son
 * confidenciales y el flag no puede depender de que la UI esté bien.
 *
 * Reglas: admin/encargado/superadmin siempre; empleado solo con `can_access_dental_clinical`
 * (el flag genérico de "expediente clínico" — se reutiliza en vez de duplicar columna); cajero
 * (recepción) nunca, sin importar el flag.
 */
trait ClinicalRecordAccess
{
    private const ADMIN_ROLES = ['admin', 'encargado', 'superadmin'];

    private function resolveBusinessId(Request $request): ?string
    {
        $fromProfile = $request->user()?->profile?->business_id;
        if ($fromProfile) {
            return $fromProfile;
        }
        $raw = $request->query('business_id');
        if ($raw && preg_match('/eq\.(.+)/', $raw, $m)) {
            return $m[1];
        }
        return $raw ?: null;
    }

    private function findClient(string $clientId, string $businessId): ?Client
    {
        return Client::where('business_id', $businessId)->find($clientId);
    }

    private function isAdminRole(Request $request): bool
    {
        return in_array($request->user()?->profile?->role, self::ADMIN_ROLES, true);
    }

    /** Devuelve una respuesta 403 si el usuario no puede ver el expediente clínico; null si puede. */
    private function denyUnlessClinicalAccess(Request $request): ?JsonResponse
    {
        $profile = $request->user()?->profile;
        if (!$profile) {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        if ($this->isAdminRole($request)) {
            return null;
        }

        if ($profile->role === 'cajero' || $profile->can_access_dental_clinical === false) {
            return response()->json(['message' => 'No tienes permiso para ver el expediente clínico.'], 403);
        }

        return null;
    }

    /** Autor del registro o rol administrativo — para editar notas/planes ajenos. */
    private function canModify(Request $request, ?string $createdBy): bool
    {
        return $this->isAdminRole($request) || ($createdBy !== null && $createdBy === $request->user()?->id);
    }

    /**
     * Anota el acceso en la bitácora clínica (quién, qué, cuándo, desde qué IP). Un fallo al
     * escribir la bitácora se registra en el log de la aplicación pero NO tumba la petición:
     * bloquear la atención clínica por un problema de auditoría sería peor que el hueco.
     */
    private function audit(
        Request $request,
        string $businessId,
        string $clientId,
        string $action,
        string $resource,
        ?string $resourceId = null,
        ?string $detail = null,
        ?string $caseId = null,
    ): void {
        try {
            app(ClinicalAuditService::class)->record(
                $businessId, $clientId, $request->user()?->id, $action, $resource, $resourceId, $detail, $request->ip(), $caseId,
            );
        } catch (\Throwable $e) {
            Log::error('clinical.audit_failed', [
                'business_id' => $businessId, 'client_id' => $clientId, 'action' => $action,
                'resource' => $resource, 'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Negocio + permiso + caso del negocio, en un paso (para los endpoints /clinical-cases/{id}/...).
     *
     * @return array{0: ?string, 1: ?ClinicalCase, 2: ?JsonResponse}
     */
    private function resolveCaseContext(Request $request, string $caseId): array
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return [null, null, response()->json(['message' => 'No autorizado.'], 403)];
        }
        if ($denied = $this->denyUnlessClinicalAccess($request)) {
            return [null, null, $denied];
        }
        $case = app(CaseService::class)->find($caseId, $businessId);
        if (!$case) {
            return [null, null, response()->json(['message' => 'Caso no encontrado.'], 404)];
        }

        return [$businessId, $case, null];
    }

    /**
     * Audita un evento de un caso: la bitácora exige un paciente, así que va con client_id = titular
     * del caso y además case_id. Si el caso no tuviera titular activo no hay a quién atribuirlo.
     */
    private function auditCase(Request $request, ClinicalCase $case, string $action, string $resource = 'case', ?string $resourceId = null, ?string $detail = null): void
    {
        $titular = app(CaseService::class)->titular($case);
        if ($titular) {
            $this->audit($request, $case->business_id, $titular, $action, $resource, $resourceId ?? ($resource === 'case' ? $case->id : null), $detail, $case->id);
        }
    }

    /**
     * Resuelve negocio + permiso + paciente en un paso. Devuelve [businessId, client, error];
     * si error no es null, el controller debe devolverlo tal cual.
     *
     * @return array{0: ?string, 1: ?Client, 2: ?JsonResponse}
     */
    private function resolveClinicalContext(Request $request, string $clientId): array
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return [null, null, response()->json(['message' => 'No autorizado.'], 403)];
        }

        if ($denied = $this->denyUnlessClinicalAccess($request)) {
            return [null, null, $denied];
        }

        $client = $this->findClient($clientId, $businessId);
        if (!$client) {
            return [null, null, response()->json(['message' => 'Paciente no encontrado.'], 404)];
        }

        return [$businessId, $client, null];
    }
}
