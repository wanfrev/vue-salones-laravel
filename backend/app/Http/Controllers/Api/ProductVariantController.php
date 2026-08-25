<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Services\ProductVariantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductVariantController
{
    public function __construct(
        private ProductVariantService $variantService,
    ) {}

    private function resolveBusinessId(Request $request): ?string
    {
        $fromProfile = $request->user()?->profile?->business_id;
        if ($fromProfile) {
            return $fromProfile;
        }
        $raw = $request->query('business_id');
        if ($raw && preg_match('/eq\.(.+)/', $raw, $m)) {
            return $m[1];
        }
        return $raw ?: null;
    }

    public function attributes(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json([]);

        return response()->json($this->variantService->listAttributes($businessId));
    }

    public function storeAttribute(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'name' => 'required|string|max:100',
        ]);

        $attribute = $this->variantService->storeAttribute($data['name'], $businessId);
        return response()->json($attribute, 201);
    }

    public function storeAttributeValue(Request $request, string $attributeId): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'value' => 'required|string|max:100',
        ]);

        try {
            $value = $this->variantService->storeAttributeValue($attributeId, $data['value'], $businessId);
            return response()->json($value, 201);
        } catch (\Throwable $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 404);
        }
    }

    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        $productId = $request->query('product_id');
        if (!$businessId || !$productId) return response()->json([]);

        try {
            return response()->json($this->variantService->listVariants($productId, $businessId));
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function store(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'product_id' => 'required|uuid',
            'branch_id' => 'nullable|uuid',
            'name' => 'nullable|string|max:255',
            'sku' => 'nullable|string|max:100',
            'barcode' => 'nullable|string|max:100',
            'unit_cost' => 'nullable|numeric|min:0',
            'unit_price' => 'nullable|numeric|min:0',
            'active' => 'boolean',
            'metadata' => 'nullable|array',
            'attribute_value_ids' => 'nullable|array',
            'attribute_value_ids.*' => 'uuid',
        ]);

        try {
            $variant = $this->variantService->storeVariant($data['product_id'], $data, $businessId);
            EntityChanged::safe($businessId, 'product_variant', 'created', $variant->id);
            return response()->json($variant, 201);
        } catch (\Throwable $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 400);
        }
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'sku' => 'nullable|string|max:100',
            'barcode' => 'nullable|string|max:100',
            'unit_cost' => 'nullable|numeric|min:0',
            'unit_price' => 'nullable|numeric|min:0',
            'active' => 'boolean',
            'metadata' => 'nullable|array',
            'attribute_value_ids' => 'nullable|array',
            'attribute_value_ids.*' => 'uuid',
        ]);

        try {
            $variant = $this->variantService->updateVariant($id, $data, $businessId);
            EntityChanged::safe($businessId, 'product_variant', 'updated', $id);
            return response()->json($variant);
        } catch (\Throwable $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 400);
        }
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        try {
            $this->variantService->destroyVariant($id, $businessId);
            EntityChanged::safe($businessId, 'product_variant', 'deleted', $id);
            return response()->json(null, 204);
        } catch (\Throwable $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 400);
        }
    }
}
