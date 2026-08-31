<?php

namespace App\Services\Staffing;

use App\Models\StaffingIncident;
use App\Models\StaffingIncidentFile;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Workplace incident tracking. Files live on the PRIVATE `local` disk, same as
 * EmployeeDocumentService/StaffingTaxEntryService — reachable only through the authenticated
 * download routes, never a public URL. Reporte/Relief Form are upsert-single-file fields (one
 * per incident, replaced on re-upload, mirroring StaffingTaxEntry); Facturas/Paperwork/Drug
 * Test/Fotos are add-many fields backed by the staffing_incident_files child table (mirroring
 * EmployeeDocument).
 */
class StaffingIncidentService
{
    private const DISK = 'local';
    private const SINGLE_FILE_FIELDS = ['reporte', 'relief_form'];
    private const MULTI_FILE_TYPES = [
        StaffingIncidentFile::TYPE_FACTURA,
        StaffingIncidentFile::TYPE_PAPERWORK,
        StaffingIncidentFile::TYPE_DRUG_TEST,
        StaffingIncidentFile::TYPE_FOTO,
    ];

    public function list(string $businessId, ?string $companyId = null, ?string $status = null): Collection
    {
        $query = StaffingIncident::with(['employee:id,full_name', 'company:id,name', 'files'])
            ->where('business_id', $businessId)
            ->orderByDesc('incident_date');

        if ($companyId) {
            $query->where('company_id', $companyId);
        }
        if ($status) {
            $query->where('status', $status);
        }

        return $query->get();
    }

    public function store(array $data, string $businessId, ?string $createdBy = null): StaffingIncident
    {
        return StaffingIncident::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'branch_id' => $data['branch_id'] ?? null,
            'employee_id' => $data['employee_id'],
            'company_id' => $data['company_id'] ?? null,
            'comments' => $data['comments'] ?? null,
            'incident_date' => $data['incident_date'],
            'follow_up_date' => $data['follow_up_date'] ?? null,
            'wants_urgent_care' => $data['wants_urgent_care'] ?? null,
            'status' => $data['status'] ?? StaffingIncident::STATUS_ACTIVO,
            'drug_test_result' => $data['drug_test_result'] ?? null,
            'created_by' => $createdBy,
        ])->load(['employee:id,full_name', 'company:id,name', 'files']);
    }

    public function update(string $id, array $data, string $businessId): StaffingIncident
    {
        $incident = $this->findForBusiness($id, $businessId);

        $incident->update(array_intersect_key($data, array_flip([
            'branch_id', 'employee_id', 'company_id', 'comments', 'incident_date',
            'follow_up_date', 'wants_urgent_care', 'status', 'drug_test_result',
        ])));

        return $incident->fresh(['employee:id,full_name', 'company:id,name', 'files']);
    }

    public function destroy(string $id, string $businessId): void
    {
        $incident = $this->findForBusiness($id, $businessId);

        foreach ($incident->files as $file) {
            Storage::disk(self::DISK)->delete($file->file_path);
        }
        foreach ([$incident->reporte_file_path, $incident->relief_form_file_path] as $path) {
            if ($path) {
                Storage::disk(self::DISK)->delete($path);
            }
        }

        $incident->delete();
    }

    /** Reporte or Relief Form — one file per field, the old one is replaced on re-upload. */
    public function uploadSingleFile(string $id, string $businessId, string $field, UploadedFile $file): StaffingIncident
    {
        if (!in_array($field, self::SINGLE_FILE_FIELDS, true)) {
            throw new NotFoundHttpException('Campo de archivo no válido.');
        }

        $incident = $this->findForBusiness($id, $businessId);
        $pathColumn = "{$field}_file_path";
        $nameColumn = "{$field}_file_original_name";

        if ($incident->{$pathColumn}) {
            Storage::disk(self::DISK)->delete($incident->{$pathColumn});
        }

        $path = $file->store("staffing-incidents/{$businessId}/{$incident->id}", self::DISK);
        $incident->update([
            $pathColumn => $path,
            $nameColumn => $file->getClientOriginalName(),
        ]);

        return $incident->fresh(['employee:id,full_name', 'company:id,name', 'files']);
    }

    /** Facturas, Paperwork, Drug Test, Fotos — adds one more file, never replaces. */
    public function addFile(string $id, string $businessId, string $fileType, UploadedFile $file, ?string $uploadedBy = null): StaffingIncidentFile
    {
        if (!in_array($fileType, self::MULTI_FILE_TYPES, true)) {
            throw new NotFoundHttpException('Tipo de archivo no válido.');
        }

        $incident = $this->findForBusiness($id, $businessId);
        $path = $file->store("staffing-incidents/{$businessId}/{$incident->id}/{$fileType}", self::DISK);

        return StaffingIncidentFile::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'incident_id' => $incident->id,
            'file_type' => $fileType,
            'file_path' => $path,
            'file_original_name' => $file->getClientOriginalName(),
            'uploaded_by' => $uploadedBy,
        ]);
    }

    public function destroyFile(string $fileId, string $businessId): void
    {
        $file = $this->findFileForBusiness($fileId, $businessId);
        Storage::disk(self::DISK)->delete($file->file_path);
        $file->delete();
    }

    public function findFileForBusiness(string $fileId, string $businessId): StaffingIncidentFile
    {
        $file = StaffingIncidentFile::find($fileId);
        if (!$file || $file->business_id !== $businessId) {
            throw new NotFoundHttpException('Archivo no encontrado.');
        }

        return $file;
    }

    public function findForBusiness(string $id, string $businessId): StaffingIncident
    {
        $incident = StaffingIncident::with(['employee:id,full_name', 'company:id,name', 'files'])->find($id);
        if (!$incident || $incident->business_id !== $businessId) {
            throw new NotFoundHttpException('Incidente no encontrado.');
        }

        return $incident;
    }
}
