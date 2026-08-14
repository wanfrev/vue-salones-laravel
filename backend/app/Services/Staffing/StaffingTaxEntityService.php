<?php

namespace App\Services\Staffing;

use App\Models\StaffingTaxEntity;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/** Plain CRUD for the configurable tax-entity columns — same shape as StaffingRateService. */
class StaffingTaxEntityService
{
    public function list(string $businessId): Collection
    {
        return StaffingTaxEntity::where('business_id', $businessId)
            ->orderBy('name')
            ->get();
    }

    public function store(array $data, string $businessId): StaffingTaxEntity
    {
        return StaffingTaxEntity::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'name' => $data['name'],
            'active' => $data['active'] ?? true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function update(string $id, array $data, string $businessId): StaffingTaxEntity
    {
        $entity = $this->findForBusiness($id, $businessId);
        $entity->update($data + ['updated_at' => now()]);

        return $entity->fresh();
    }

    public function destroy(string $id, string $businessId): void
    {
        $this->findForBusiness($id, $businessId)->delete();
    }

    public function findForBusiness(string $id, string $businessId): StaffingTaxEntity
    {
        $entity = StaffingTaxEntity::find($id);
        if (!$entity || $entity->business_id !== $businessId) {
            throw new NotFoundHttpException('Entidad de tax no encontrada.');
        }

        return $entity;
    }
}
