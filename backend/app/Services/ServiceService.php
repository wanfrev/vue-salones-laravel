<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Business;
use App\Models\Service;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ServiceService
{
    public function list(string $businessId, ?string $branchId = null): Collection
    {
        $query = Service::query()
            ->where('business_id', $businessId)
            ->orderBy('name');

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        return $query->get();
    }

    public function listActive(string $businessId, ?string $branchId = null): Collection
    {
        return $this->list($businessId, $branchId)->where('active', true);
    }

    public function store(array $data, string $businessId): Service
    {
        $service = Service::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'branch_id' => $data['branch_id'] ?? null,
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'duration_minutes' => $data['duration_minutes'] ?? 60,
            'price' => $data['price'] ?? 0,
            'local_percentage' => $data['local_percentage'] ?? 50,
            'color' => $data['color'] ?? null,
            'category' => $data['category'] ?? 'otros',
            'icon' => $data['icon'] ?? null,
            'active' => $data['active'] ?? true,
            'linked_product_id' => $data['linked_product_id'] ?? null,
            'linked_variant_id' => $data['linked_variant_id'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $cat = $data['category'] ?? '';
        if ($cat === '' || $cat === 'otros') {
            return $service;
        }

        if (!empty($data['branch_id'])) {
            $branch = Branch::find($data['branch_id']);
            if ($branch) {
                $categories = $branch->service_categories ?? [];
                if (!$this->categoryExists($categories, $cat)) {
                    $categories[] = ['id' => Str::uuid()->toString(), 'name' => $cat];
                    $branch->update(['service_categories' => $categories, 'updated_at' => now()]);
                }
            }
        } else {
            $business = Business::find($businessId);
            if ($business) {
                $categories = $business->service_categories ?? [];
                if (!$this->categoryExists($categories, $cat)) {
                    $categories[] = ['id' => Str::uuid()->toString(), 'name' => $cat];
                    $business->update(['service_categories' => $categories, 'updated_at' => now()]);
                }
            }
        }

        return $service;
    }

    public function update(string $id, array $data, string $businessId): Service
    {
        $service = $this->findForBusiness($id, $businessId);

        $service->update(array_filter($data, fn($k) => in_array($k, [
            'name', 'description', 'duration_minutes', 'price', 'local_percentage',
            'color', 'category', 'icon', 'active', 'branch_id', 'linked_product_id', 'linked_variant_id',
        ]), ARRAY_FILTER_USE_KEY) + ['updated_at' => now()]);

        return $service->fresh();
    }

    public function destroy(string $id, string $businessId): void
    {
        $service = $this->findForBusiness($id, $businessId);

        try {
            $service->delete();
        } catch (\Illuminate\Database\QueryException $e) {
            if ((string) $e->getCode() === '23503') {
                throw new \Symfony\Component\HttpKernel\Exception\HttpException(422, 'No se puede eliminar el servicio porque tiene citas asociadas.');
            }
            throw $e;
        }
    }

    public function renameCategory(string $businessId, string $oldName, string $newName, ?string $branchId = null): void
    {
        if ($branchId) {
            $branch = Branch::find($branchId);
            if (!$branch) {
                throw new NotFoundHttpException('Sucursal no encontrada.');
            }
            $categories = $branch->service_categories ?? [];
            $this->renameInArray($categories, $oldName, $newName);
            $branch->update(['service_categories' => $categories, 'updated_at' => now()]);

            Service::where('business_id', $businessId)
                ->where('branch_id', $branchId)
                ->where('category', $oldName)
                ->update(['category' => $newName, 'updated_at' => now()]);
            return;
        }

        $business = Business::find($businessId);
        if (!$business) {
            throw new NotFoundHttpException('Negocio no encontrado.');
        }

        $categories = $business->service_categories ?? [];
        $this->renameInArray($categories, $oldName, $newName);
        $business->update(['service_categories' => $categories, 'updated_at' => now()]);

        Service::where('business_id', $businessId)
            ->whereNull('branch_id')
            ->where('category', $oldName)
            ->update(['category' => $newName, 'updated_at' => now()]);
    }

    public function deleteCategory(string $businessId, string $categoryName, string $replacementCategory = '', ?string $branchId = null): void
    {
        if ($branchId) {
            $branch = Branch::find($branchId);
            if (!$branch) {
                throw new NotFoundHttpException('Sucursal no encontrada.');
            }
            $categories = $branch->service_categories ?? [];
            $categories = array_values(array_filter($categories, fn($cat) =>
                ($cat['name'] ?? $cat) !== $categoryName
            ));
            $branch->update(['service_categories' => $categories, 'updated_at' => now()]);

            $query = Service::where('business_id', $businessId)
                ->where('branch_id', $branchId)
                ->where('category', $categoryName);
            if ($replacementCategory !== '') {
                $query->update(['category' => $replacementCategory, 'updated_at' => now()]);
            } else {
                $query->update(['category' => '', 'updated_at' => now()]);
            }
            return;
        }

        $business = Business::find($businessId);
        if (!$business) {
            throw new NotFoundHttpException('Negocio no encontrado.');
        }

        $categories = $business->service_categories ?? [];
        $categories = array_values(array_filter($categories, fn($cat) =>
            ($cat['name'] ?? $cat) !== $categoryName
        ));
        $business->update(['service_categories' => $categories, 'updated_at' => now()]);

        $query = Service::where('business_id', $businessId)
            ->whereNull('branch_id')
            ->where('category', $categoryName);
        if ($replacementCategory !== '') {
            $query->update(['category' => $replacementCategory, 'updated_at' => now()]);
        } else {
            $query->update(['category' => '', 'updated_at' => now()]);
        }
    }

    private function categoryExists(array $categories, string $name): bool
    {
        foreach ($categories as $cat) {
            if (($cat['name'] ?? $cat) === $name) {
                return true;
            }
        }
        return false;
    }

    private function renameInArray(array &$categories, string $oldName, string $newName): void
    {
        foreach ($categories as &$cat) {
            if (($cat['name'] ?? $cat) === $oldName) {
                if (is_array($cat)) {
                    $cat['name'] = $newName;
                } else {
                    $cat = $newName;
                }
            }
        }
    }

    public function findForBusiness(string $id, string $businessId): Service
    {
        $service = Service::find($id);
        if (!$service || $service->business_id !== $businessId) {
            throw new NotFoundHttpException('Servicio no encontrado.');
        }
        return $service;
    }

    public function find(string $id): ?Service
    {
        return Service::find($id);
    }
}
