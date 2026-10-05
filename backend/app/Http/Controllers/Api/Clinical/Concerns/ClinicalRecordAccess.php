<?php

namespace App\Http\Controllers\Api\Clinical\Concerns;

use App\Models\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
