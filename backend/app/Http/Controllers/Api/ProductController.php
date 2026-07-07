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

    public function index(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json([]);

        return response()->json(
            $this->productService->list($p->business_id, $request->branch_id)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

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

        $product = $this->productService->store($data, $p->business_id);
        EntityChanged::dispatch($p->business_id, 'product', 'created', $product->id);
        return response()->json($product, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

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

        $product = $this->productService->update($id, $data, $p?->business_id);
        EntityChanged::dispatch($p->business_id, 'product', 'updated', $id);
        return response()->json($product);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $this->productService->destroy($id, $p?->business_id);
        EntityChanged::dispatch($p->business_id, 'product', 'deleted', $id);
        return response()->json(null, 204);
    }
}
