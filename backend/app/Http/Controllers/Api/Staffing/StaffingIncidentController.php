<?php

namespace App\Http\Controllers\Api\Staffing;

use App\Events\EntityChanged;
use App\Models\StaffingIncident;
use App\Services\Staffing\StaffingIncidentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

class StaffingIncidentController
{
    public function __construct(
        private StaffingIncidentService $incidents,
    ) {}

    private function resolveBusinessId(Request $request): ?string
    {
        return $request->user()?->load('profile')?->profile?->business_id;
    }

    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json([]);
        }

        return response()->json(
            $this->incidents->list($businessId, $request->query('company_id'), $request->query('status'))
        );
    }

    public function store(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validate([
            'branch_id' => 'nullable|uuid',
            'employee_id' => 'required|uuid',
            'company_id' => 'nullable|uuid',
            'comments' => 'nullable|string',
            'incident_date' => 'required|date',
            'follow_up_date' => 'nullable|date',
            'wants_urgent_care' => 'nullable|boolean',
            'status' => 'nullable|in:' . implode(',', [
                StaffingIncident::STATUS_ACTIVO, StaffingIncident::STATUS_LIGHT_DUTY,
                StaffingIncident::STATUS_SUSPENDIDO, StaffingIncident::STATUS_DESPEDIDO,
            ]),
            'drug_test_result' => 'nullable|in:' . implode(',', [
                StaffingIncident::DRUG_TEST_POSITIVO, StaffingIncident::DRUG_TEST_NEGATIVO, StaffingIncident::DRUG_TEST_PENDIENTE,
            ]),
        ]);

        $p = $request->user()?->load('profile')?->profile;
        $incident = $this->incidents->store($data, $businessId, $p?->id);
        EntityChanged::safe($businessId, 'staffing_incident', 'created', $incident->id);

        return response()->json($incident, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validate([
            'branch_id' => 'nullable|uuid',
            'employee_id' => 'sometimes|uuid',
            'company_id' => 'nullable|uuid',
            'comments' => 'nullable|string',
            'incident_date' => 'sometimes|date',
            'follow_up_date' => 'nullable|date',
            'wants_urgent_care' => 'nullable|boolean',
            'status' => 'nullable|in:' . implode(',', [
                StaffingIncident::STATUS_ACTIVO, StaffingIncident::STATUS_LIGHT_DUTY,
                StaffingIncident::STATUS_SUSPENDIDO, StaffingIncident::STATUS_DESPEDIDO,
            ]),
            'drug_test_result' => 'nullable|in:' . implode(',', [
                StaffingIncident::DRUG_TEST_POSITIVO, StaffingIncident::DRUG_TEST_NEGATIVO, StaffingIncident::DRUG_TEST_PENDIENTE,
            ]),
        ]);

        $incident = $this->incidents->update($id, $data, $businessId);
        EntityChanged::safe($businessId, 'staffing_incident', 'updated', $id);

        return response()->json($incident);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $this->incidents->destroy($id, $businessId);
        EntityChanged::safe($businessId, 'staffing_incident', 'deleted', $id);

        return response()->json(null, 204);
    }

    /** Reporte or Relief Form — single file, replaced on re-upload. */
    public function uploadSingleFile(Request $request, string $id, string $field): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $request->validate(['file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240']);

        $incident = $this->incidents->uploadSingleFile($id, $businessId, $field, $request->file('file'));
        EntityChanged::safe($businessId, 'staffing_incident', 'updated', $id);

        return response()->json($incident, 201);
    }

    public function downloadSingleFile(Request $request, string $id, string $field): Response|JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $incident = $this->incidents->findForBusiness($id, $businessId);
        $pathColumn = "{$field}_file_path";
        $nameColumn = "{$field}_file_original_name";
        $path = $incident->{$pathColumn} ?? null;

        if (!$path || !Storage::disk('local')->exists($path)) {
            return response()->json(['error' => ['message' => 'Archivo no encontrado.']], 404);
        }

        return Storage::disk('local')->download($path, $incident->{$nameColumn} ?? 'documento');
    }

    /** Facturas, Paperwork, Drug Test, Fotos — adds one more file, never replaces. */
    public function addFile(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validate([
            'file_type' => 'required|in:factura,paperwork,drug_test,foto',
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        $p = $request->user()?->load('profile')?->profile;
        $file = $this->incidents->addFile($id, $businessId, $data['file_type'], $request->file('file'), $p?->id);
        EntityChanged::safe($businessId, 'staffing_incident', 'updated', $id);

        return response()->json($file, 201);
    }

    public function destroyFile(Request $request, string $fileId): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $file = $this->incidents->findFileForBusiness($fileId, $businessId);
        $incidentId = $file->incident_id;
        $this->incidents->destroyFile($fileId, $businessId);
        EntityChanged::safe($businessId, 'staffing_incident', 'updated', $incidentId);

        return response()->json(null, 204);
    }

    public function downloadFile(Request $request, string $fileId): Response|JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $file = $this->incidents->findFileForBusiness($fileId, $businessId);
        if (!Storage::disk('local')->exists($file->file_path)) {
            return response()->json(['error' => ['message' => 'Archivo no encontrado.']], 404);
        }

        return Storage::disk('local')->download($file->file_path, $file->file_original_name);
    }
}
