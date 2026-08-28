<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductCategory;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;
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
        try {
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
                'unit_price_2' => $data['unit_price_2'] ?? null,
                'reorder_point' => $data['reorder_point'] ?? 0,
                'active' => $data['active'] ?? true,
                'is_sellable' => $data['is_sellable'] ?? true,
                'metadata' => $data['metadata'] ?? [],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (UniqueConstraintViolationException $e) {
            throw new HttpException(422, $this->duplicateMessage($e));
        }
    }

    public function update(string $id, array $data, string $businessId): Product
    {
        $product = $this->findForBusiness($id, $businessId);

        try {
            $product->update($data + ['updated_at' => now()]);
        } catch (UniqueConstraintViolationException $e) {
            throw new HttpException(422, $this->duplicateMessage($e));
        }

        return $product->fresh();
    }

    private function duplicateMessage(UniqueConstraintViolationException $e): string
    {
        if (str_contains($e->getMessage(), 'products_business_id_sku_key')) {
            return 'Ya existe un producto con ese SKU en este negocio.';
        }
        return 'Ya existe un producto con ese nombre en este negocio.';
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
        $query = ProductCategory::query()
            ->where('business_id', $businessId)
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

    public function updateCategory(string $id, array $data, string $businessId): ProductCategory
    {
        $category = $this->findCategoryForBusiness($id, $businessId);
        $category->update([
            'name' => $data['name'],
            'description' => array_key_exists('description', $data) ? $data['description'] : $category->description,
            'updated_at' => now(),
        ]);
        return $category->fresh();
    }

    public function destroyCategory(string $id, string $businessId, ?string $reassignToId = null): void
    {
        $category = $this->findCategoryForBusiness($id, $businessId);

        if ($reassignToId) {
            $this->findCategoryForBusiness($reassignToId, $businessId);
            Product::where('business_id', $businessId)
                ->where('category_id', $id)
                ->update(['category_id' => $reassignToId, 'updated_at' => now()]);
        } else {
            Product::where('business_id', $businessId)
                ->where('category_id', $id)
                ->update(['category_id' => null, 'updated_at' => now()]);
        }

        $category->delete();
    }

    /**
     * Products historically sold alongside $productId in the same direct-sale checkout
     * (same inventory_movements.reference_id), ordered by how often they co-occur.
     */
    public function frequentlyBoughtWith(string $businessId, string $productId, ?string $branchId = null, int $limit = 3, int $minCoOccurrences = 2): Collection
    {
        $coOccurrences = DB::table('inventory_movements as a')
            ->join('inventory_movements as b', 'a.reference_id', '=', 'b.reference_id')
            ->where('a.business_id', $businessId)
            ->where('b.business_id', $businessId)
            ->where('a.movement_type', 'sale')
            ->where('b.movement_type', 'sale')
            ->where('a.reference_type', 'direct')
            ->where('b.reference_type', 'direct')
            ->where('a.product_id', $productId)
            ->where('b.product_id', '!=', $productId)
            ->select('b.product_id', DB::raw('COUNT(*) as times_together'))
            ->groupBy('b.product_id')
            ->havingRaw('COUNT(*) >= ?', [$minCoOccurrences])
            ->orderByDesc('times_together')
            ->limit($limit)
            ->get();

        if ($coOccurrences->isEmpty()) {
            return collect();
        }

        $productIds = $coOccurrences->pluck('product_id')->all();
        $countMap = $coOccurrences->pluck('times_together', 'product_id');

        $productsQuery = Product::where('business_id', $businessId)
            ->where('active', true)
            ->where('is_sellable', true)
            ->whereIn('id', $productIds);

        if ($branchId) {
            $productsQuery->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        $products = $productsQuery->get()->keyBy('id');

        if ($products->isEmpty()) {
            return collect();
        }

        $stockQuery = DB::table('inventory_stock')
            ->select('product_id', DB::raw('SUM(quantity) as total_qty'), DB::raw('COALESCE(SUM(reserved_qty), 0) as total_reserved'))
            ->where('business_id', $businessId)
            ->whereIn('product_id', $products->keys())
            ->groupBy('product_id');

        if ($branchId) {
            $stockQuery->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        $stockMap = $stockQuery->get()->keyBy('product_id');

        return collect($productIds)
            ->filter(fn ($id) => $products->has($id))
            ->map(function ($id) use ($products, $stockMap, $countMap) {
                $product = $products->get($id);
                $stock = $stockMap->get($id);
                $product->available_qty = $stock ? max(0, (float) $stock->total_qty - (float) $stock->total_reserved) : 0;
                $product->times_bought_together = (int) $countMap->get($id, 0);
                return $product;
            })
            ->values();
    }

    public function findCategoryForBusiness(string $id, string $businessId): ProductCategory
    {
        $category = ProductCategory::find($id);
        if (!$category || $category->business_id !== $businessId) {
            throw new NotFoundHttpException('Categoría no encontrada.');
        }
        return $category;
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
