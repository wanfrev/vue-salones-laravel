<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductAttribute;
use App\Models\ProductAttributeValue;
use App\Models\ProductVariant;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ProductVariantService
{
    public function listAttributes(string $businessId): Collection
    {
        return ProductAttribute::with('values')
            ->where('business_id', $businessId)
            ->orderBy('name')
            ->get();
    }

    public function storeAttribute(string $name, string $businessId): ProductAttribute
    {
        $name = trim($name);
        $existing = ProductAttribute::where('business_id', $businessId)
            ->whereRaw('lower(name) = ?', [mb_strtolower($name)])
            ->first();
        if ($existing) return $existing;

        return ProductAttribute::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'name' => $name,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function storeAttributeValue(string $attributeId, string $value, string $businessId): ProductAttributeValue
    {
        $attribute = $this->findAttributeForBusiness($attributeId, $businessId);
        $value = trim($value);

        $existing = ProductAttributeValue::where('attribute_id', $attribute->id)
            ->whereRaw('lower(value) = ?', [mb_strtolower($value)])
            ->first();
        if ($existing) return $existing;

        $maxOrder = ProductAttributeValue::where('attribute_id', $attribute->id)->max('sort_order') ?? 0;

        return ProductAttributeValue::create([
            'id' => Str::uuid()->toString(),
            'attribute_id' => $attribute->id,
            'value' => $value,
            'sort_order' => $maxOrder + 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function listVariants(string $productId, string $businessId): Collection
    {
        $this->findProductForBusiness($productId, $businessId);

        $variants = ProductVariant::with('attributeValues.attribute')
            ->where('product_id', $productId)
            ->orderBy('name')
            ->get();

        $stockMap = \Illuminate\Support\Facades\DB::table('inventory_stock')
            ->select('variant_id', \Illuminate\Support\Facades\DB::raw('SUM(quantity) as total_qty'), \Illuminate\Support\Facades\DB::raw('COALESCE(SUM(reserved_qty), 0) as total_reserved'))
            ->whereIn('variant_id', $variants->pluck('id'))
            ->groupBy('variant_id')
            ->get()
            ->keyBy('variant_id');

        return $variants->map(function (ProductVariant $variant) use ($stockMap) {
            $stock = $stockMap->get($variant->id);
            $variant->available_qty = $stock ? max(0, (float) $stock->total_qty - (float) $stock->total_reserved) : 0;
            return $variant;
        });
    }

    public function storeVariant(string $productId, array $data, string $businessId): ProductVariant
    {
        $this->findProductForBusiness($productId, $businessId);

        $attributeValueIds = $data['attribute_value_ids'] ?? [];
        $values = ProductAttributeValue::with('attribute')
            ->whereIn('id', $attributeValueIds)
            ->get();

        $variant = \Illuminate\Support\Facades\DB::transaction(function () use ($productId, $data, $values) {
            $variant = ProductVariant::create([
                'id' => Str::uuid()->toString(),
                'product_id' => $productId,
                'branch_id' => $data['branch_id'] ?? null,
                'name' => $this->buildVariantName($values) ?: ($data['name'] ?? 'Variante'),
                'sku' => $data['sku'] ?? null,
                'barcode' => $data['barcode'] ?? null,
                'unit_cost' => $data['unit_cost'] ?? 0,
                'unit_price' => $data['unit_price'] ?? 0,
                'metadata' => $data['metadata'] ?? [],
                'active' => $data['active'] ?? true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if ($values->isNotEmpty()) {
                $variant->attributeValues()->sync($values->pluck('id')->all());
            }

            return $variant;
        });

        return $variant->fresh('attributeValues.attribute');
    }

    public function updateVariant(string $id, array $data, string $businessId): ProductVariant
    {
        $variant = $this->findVariantForBusiness($id, $businessId);

        $attributeValueIds = $data['attribute_value_ids'] ?? null;
        $values = $attributeValueIds !== null
            ? ProductAttributeValue::with('attribute')->whereIn('id', $attributeValueIds)->get()
            : $variant->attributeValues()->with('attribute')->get();

        $updates = collect($data)->only(['sku', 'barcode', 'unit_cost', 'unit_price', 'metadata', 'active'])->all();
        if ($attributeValueIds !== null) {
            $updates['name'] = $this->buildVariantName($values) ?: $variant->name;
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($variant, $updates, $attributeValueIds, $values) {
            $variant->update($updates + ['updated_at' => now()]);

            if ($attributeValueIds !== null) {
                $variant->attributeValues()->sync($values->pluck('id')->all());
            }
        });

        return $variant->fresh('attributeValues.attribute');
    }

    public function destroyVariant(string $id, string $businessId): void
    {
        $variant = $this->findVariantForBusiness($id, $businessId);
        $variant->delete();
    }

    private function buildVariantName(Collection $values): string
    {
        return $values
            ->sortBy(fn (ProductAttributeValue $v) => $v->attribute?->name)
            ->pluck('value')
            ->implode(' / ');
    }

    private function findProductForBusiness(string $id, string $businessId): Product
    {
        $product = Product::find($id);
        if (!$product || $product->business_id !== $businessId) {
            throw new NotFoundHttpException('Producto no encontrado.');
        }
        return $product;
    }

    private function findAttributeForBusiness(string $id, string $businessId): ProductAttribute
    {
        $attribute = ProductAttribute::find($id);
        if (!$attribute || $attribute->business_id !== $businessId) {
            throw new NotFoundHttpException('Atributo no encontrado.');
        }
        return $attribute;
    }

    private function findVariantForBusiness(string $id, string $businessId): ProductVariant
    {
        $variant = ProductVariant::with('product')->find($id);
        if (!$variant || !$variant->product || $variant->product->business_id !== $businessId) {
            throw new NotFoundHttpException('Variante no encontrada.');
        }
        return $variant;
    }
}
