<?php

namespace App\Http\Controllers\Api\Clinical;

use App\Http\Controllers\Api\Clinical\Concerns\ClinicalRecordAccess;
use App\Services\Clinical\ClinicalAuditService;
use App\Services\Clinical\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use InvalidArgumentException;

/**
 * Informes imprimibles (constancia de asistencia, informe psicológico, carta de derivación). El
 * documento se arma y se imprime en el navegador; el servidor aporta los datos que no están a
 * mano (asistencia por rango) y deja constancia en la bitácora de que se imprimió.
 */
class ReportController
{
    use ClinicalRecordAccess;

    public function __construct(private ReportService $service)
    {
    }

    /** Sesiones atendidas en un rango de fechas — respaldo de la constancia de asistencia. */
    public function attendance(Request $request, string $clientId): JsonResponse
    {
        [$businessId, , $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;

        $data = $request->validate([
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d'],
        ]);

        try {
            return response()->json($this->service->attendance($businessId, $clientId, $data['from'], $data['to']));
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /** El navegador avisa que se imprimió un informe. */
    public function printed(Request $request, string $clientId): JsonResponse
    {
        [$businessId, , $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;

        $data = $request->validate([
            'kind' => ['required', Rule::in(ClinicalAuditService::REPORT_KINDS)],
        ]);

        $this->audit($request, $businessId, $clientId, 'report_printed', 'report', null, $data['kind']);

        return response()->json(['ok' => true], 201);
    }
}
