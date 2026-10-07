<?php

namespace App\Http\Controllers\Api\Clinical;

use App\Http\Controllers\Api\Clinical\Concerns\ClinicalRecordAccess;
use App\Services\Clinical\FollowUpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FollowUpController
{
    use ClinicalRecordAccess;

    public function __construct(private FollowUpService $service)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['message' => 'No autorizado.'], 403);

        if ($denied = $this->denyUnlessClinicalAccess($request)) {
            return $denied;
        }

        $data = $request->validate([
            'weeks' => ['nullable', 'integer', 'min:1', 'max:26'],
        ]);

        // El administrador ve las notas pendientes de todo el equipo; cada profesional, solo las suyas.
        $employeeId = $this->isAdminRole($request) ? null : $request->user()?->profile?->id;

        return response()->json(
            $this->service->build($businessId, (int) ($data['weeks'] ?? FollowUpService::DEFAULT_WEEKS), $employeeId),
        );
    }
}
