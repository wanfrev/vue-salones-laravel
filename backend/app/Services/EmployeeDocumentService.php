<?php

namespace App\Services;

use App\Models\EmployeeDocument;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Scanned documents attached to an employee's profile (ID, work letters, contracts). Files live on
 * the PRIVATE `local` disk, never the public one — reachable only through the authenticated
 * download route (EmployeeDocumentController::download), same rationale as
 * StaffingTaxEntryService: this is personal paperwork, not something to expose via a public URL.
 * Unlike StaffingTaxEntry (one file per cell, replaced on re-upload), an employee can have many
 * documents at once, so this is a plain add/list/remove table, not an upsert.
 */
class EmployeeDocumentService
{
    private const DISK = 'local';

    public function forEmployee(string $businessId, string $employeeId): Collection
    {
        return EmployeeDocument::where('business_id', $businessId)
            ->where('employee_id', $employeeId)
            ->orderByDesc('created_at')
            ->get();
    }

    public function store(array $data, string $businessId, UploadedFile $file, ?string $uploadedBy = null): EmployeeDocument
    {
        $path = $file->store("employee-documents/{$businessId}/{$data['employee_id']}", self::DISK);

        return EmployeeDocument::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'employee_id' => $data['employee_id'],
            'label' => $data['label'] ?? null,
            'file_path' => $path,
            'file_original_name' => $file->getClientOriginalName(),
            'uploaded_by' => $uploadedBy,
        ]);
    }

    public function destroy(string $id, string $businessId): void
    {
        $document = $this->findForBusiness($id, $businessId);
        Storage::disk(self::DISK)->delete($document->file_path);
        $document->delete();
    }

    public function findForBusiness(string $id, string $businessId): EmployeeDocument
    {
        $document = EmployeeDocument::find($id);
        if (!$document || $document->business_id !== $businessId) {
            throw new NotFoundHttpException('Documento no encontrado.');
        }

        return $document;
    }
}
