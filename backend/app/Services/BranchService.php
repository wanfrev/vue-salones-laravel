<?php

namespace App\Services;

use App\Models\Branch;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class BranchService
{
    public function list(string $businessId): Collection
    {
        return Branch::where('business_id', $businessId)
            ->where('active', true)
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get();
    }

    public function store(array $data, string $businessId): Branch
    {
        if (!empty($data['is_default'])) {
            Branch::where('business_id', $businessId)
                ->update(['is_default' => false]);
        }

        return Branch::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'name' => $data['name'],
            'address' => $data['address'] ?? null,
            'phone' => $data['phone'] ?? null,
            'is_default' => $data['is_default'] ?? false,
            'active' => true,
            'ves_exchange_rate' => $data['ves_exchange_rate'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function update(string $id, array $data, string $businessId): Branch
    {
        $branch = $this->findForBusiness($id, $businessId);

        if (!empty($data['is_default'])) {
            Branch::where('business_id', $businessId)
                ->where('id', '!=', $id)
                ->update(['is_default' => false]);
        }

        $branch->update([
            'name' => $data['name'] ?? $branch->name,
            'address' => array_key_exists('address', $data) ? $data['address'] : $branch->address,
            'phone' => array_key_exists('phone', $data) ? $data['phone'] : $branch->phone,
            'is_default' => $data['is_default'] ?? $branch->is_default,
            'active' => $data['active'] ?? $branch->active,
            'ves_exchange_rate' => array_key_exists('ves_exchange_rate', $data) ? $data['ves_exchange_rate'] : $branch->ves_exchange_rate,
            'updated_at' => now(),
        ]);

        return $branch->fresh();
    }

    public function destroy(string $id, string $businessId): void
    {
        $branch = $this->findForBusiness($id, $businessId);
        $branch->update(['active' => false, 'updated_at' => now()]);
    }

    public function findForBusiness(string $id, string $businessId): Branch
    {
        $branch = Branch::find($id);
        if (!$branch || $branch->business_id !== $businessId) {
            throw new NotFoundHttpException('Sucursal no encontrada.');
        }
        return $branch;
    }

    public function getDefault(string $businessId): ?Branch
    {
        return Branch::where('business_id', $businessId)
            ->where('is_default', true)
            ->where('active', true)
            ->first();
    }
}
