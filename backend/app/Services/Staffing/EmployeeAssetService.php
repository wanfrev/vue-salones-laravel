<?php

namespace App\Services\Staffing;

use App\Models\EmployeeAsset;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class EmployeeAssetService
{
    public function forEmployee(string $businessId, string $employeeId): Collection
    {
        return EmployeeAsset::where('business_id', $businessId)
            ->where('employee_id', $employeeId)
            ->orderBy('created_at')
            ->get();
    }

    public function store(array $data, string $businessId): EmployeeAsset
    {
        return EmployeeAsset::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'employee_id' => $data['employee_id'],
            'asset_type' => $data['asset_type'],
            'description' => $data['description'],
        ]);
    }

    public function update(string $id, array $data, string $businessId): EmployeeAsset
    {
        $asset = $this->findForBusiness($id, $businessId);
        $asset->update([
            'asset_type' => $data['asset_type'],
            'description' => $data['description'],
        ]);

        return $asset->fresh();
    }

    public function destroy(string $id, string $businessId): void
    {
        $this->findForBusiness($id, $businessId)->delete();
    }

    public function findForBusiness(string $id, string $businessId): EmployeeAsset
    {
        $asset = EmployeeAsset::find($id);
        if (!$asset || $asset->business_id !== $businessId) {
            throw new NotFoundHttpException('Bien asignado no encontrado.');
        }

        return $asset;
    }
}
