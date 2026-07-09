<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Services\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController
{

    public function __construct(
        private ProductService $productService,
    ) {}

    private function resolveBusinessId(Request $request): ?string
    {
        return $request->user()?->profile?->business_id;
    }

    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json([]);

        return response()->json(
            $this->productService->list($businessId, $request->branch_id)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'sku' => 'nullable|string|max:100',
            'barcode' => 'nullable|string|max:100',
            'unit' => 'nullable|string|max:50',
            'unit_cost' => 'nullable|numeric|min:0',
            'unit_price' => 'nullable|numeric|min:0',
            'reorder_point' => 'nullable|numeric|min:0',
            'active' => 'boolean',
            'is_sellable' => 'boolean',
            'category_id' => 'nullable|uuid',
            'branch_id' => 'nullable|uuid',
            'metadata' => 'nullable|array',
        ]);

        $product = $this->productService->store($data, $businessId);
        EntityChanged::safe($businessId, 'product', 'created', $product->id);
        return response()->json($product, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'sku' => 'nullable|string|max:100',
            'barcode' => 'nullable|string|max:100',
            'unit' => 'nullable|string|max:50',
            'unit_cost' => 'nullable|numeric|min:0',
            'unit_price' => 'nullable|numeric|min:0',
            'reorder_point' => 'nullable|numeric|min:0',
            'active' => 'boolean',
            'is_sellable' => 'boolean',
            'category_id' => 'nullable|uuid',
            'branch_id' => 'nullable|uuid',
            'metadata' => 'nullable|array',
        ]);

        $product = $this->productService->update($id, $data, $businessId);
        EntityChanged::safe($businessId, 'product', 'updated', $id);
        return response()->json($product);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $this->productService->destroy($id, $businessId);
        EntityChanged::safe($businessId, 'product', 'deleted', $id);
        return response()->json(null, 204);
    }
}
