<?php

namespace App\Services\Staffing;

use App\Models\StaffingTaxEntry;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Upserts one employee x tax-entity x year cell. Files are kept on the PRIVATE `local` disk, not
 * the public one — these documents are tied to an employee's SSN, so they're only reachable
 * through the authenticated download route (StaffingTaxEntryController::download), never a
 * public URL.
 */
class StaffingTaxEntryService
{
    private const DISK = 'local';

    public function list(string $businessId, ?int $year = null): Collection
    {
        $query = StaffingTaxEntry::where('business_id', $businessId);
        if ($year !== null) {
            $query->where('year', $year);
        }

        return $query->get();
    }

    public function upsert(array $data, string $businessId, ?UploadedFile $file, ?string $createdBy = null): StaffingTaxEntry
    {
        $existing = StaffingTaxEntry::where('business_id', $businessId)
            ->where('employee_id', $data['employee_id'])
            ->where('tax_entity_id', $data['tax_entity_id'])
            ->where('year', $data['year'])
            ->first();

        $filePath = $existing?->file_path;
        $fileOriginalName = $existing?->file_original_name;

        if ($file) {
            if ($existing?->file_path) {
                Storage::disk(self::DISK)->delete($existing->file_path);
            }
            $filePath = $file->store("staffing-tax-documents/{$businessId}/{$data['employee_id']}", self::DISK);
            $fileOriginalName = $file->getClientOriginalName();
        }

        $attributes = [
            'amount' => $data['amount'] ?? 0,
            'entry_date' => $data['entry_date'] ?? null,
            'file_path' => $filePath,
            'file_original_name' => $fileOriginalName,
            'updated_at' => now(),
        ];

        if ($existing) {
            $existing->update($attributes);

            return $existing->fresh();
        }

        return StaffingTaxEntry::create($attributes + [
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'employee_id' => $data['employee_id'],
            'tax_entity_id' => $data['tax_entity_id'],
            'year' => $data['year'],
            'created_by' => $createdBy,
            'created_at' => now(),
        ]);
    }

    public function destroy(string $id, string $businessId): void
    {
        $entry = $this->findForBusiness($id, $businessId);
        if ($entry->file_path) {
            Storage::disk(self::DISK)->delete($entry->file_path);
        }
        $entry->delete();
    }

    /** Clears just the attached file, keeping the amount/date — unlike destroy(), which drops the whole cell. */
    public function deleteFile(string $id, string $businessId): StaffingTaxEntry
    {
        $entry = $this->findForBusiness($id, $businessId);
        if ($entry->file_path) {
            Storage::disk(self::DISK)->delete($entry->file_path);
        }
        $entry->update(['file_path' => null, 'file_original_name' => null]);

        return $entry;
    }

    public function findForBusiness(string $id, string $businessId): StaffingTaxEntry
    {
        $entry = StaffingTaxEntry::find($id);
        if (!$entry || $entry->business_id !== $businessId) {
            throw new NotFoundHttpException('Registro de tax no encontrado.');
        }

        return $entry;
    }
}
