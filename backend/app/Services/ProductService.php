<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductCategory;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ProductService
{
    public function list(string $businessId, ?string $branchId = null): Collection
    {
        $query = Product::with('category')
            ->where('business_id', $businessId)
            ->orderBy('name');

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        return $query->get();
    }

    public function store(array $data, string $businessId): Product
    {
        return Product::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'branch_id' => $data['branch_id'] ?? null,
            'category_id' => $data['category_id'] ?? null,
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'sku' => $data['sku'] ?? null,
            'barcode' => $data['barcode'] ?? null,
            'unit' => $data['unit'] ?? 'unit',
            'unit_cost' => $data['unit_cost'] ?? 0,
            'unit_price' => $data['unit_price'] ?? 0,
            'reorder_point' => $data['reorder_point'] ?? 0,
            'active' => $data['active'] ?? true,
            'is_sellable' => $data['is_sellable'] ?? true,
            'metadata' => $data['metadata'] ?? [],
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function update(string $id, array $data, string $businessId): Product
    {
        $product = $this->findForBusiness($id, $businessId);
        $product->update($data + ['updated_at' => now()]);
        return $product->fresh();
    }

    public function destroy(string $id, string $businessId): void
    {
        $product = $this->findForBusiness($id, $businessId);
        $product->delete();
    }

    public function deactivate(string $id, string $businessId): Product
    {
        $product = $this->findForBusiness($id, $businessId);
        $product->update(['active' => false, 'updated_at' => now()]);
        return $product->fresh();
    }

    public function listCategories(string $businessId, ?string $branchId = null): Collection
    {
        $query = ProductCategory::where('business_id', $businessId)
            ->where('active', true)
            ->orderBy('name');

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        return $query->get();
    }

    public function storeCategory(array $data, string $businessId): ProductCategory
    {
        return ProductCategory::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'branch_id' => $data['branch_id'] ?? null,
            'parent_id' => $data['parent_id'] ?? null,
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'active' => true,
            'metadata' => $data['metadata'] ?? [],
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function findForBusiness(string $id, string $businessId): Product
    {
        $product = Product::find($id);
        if (!$product || $product->business_id !== $businessId) {
            throw new NotFoundHttpException('Producto no encontrado.');
        }
        return $product;
    }
}
