<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Services\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductCategoryController
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
            $this->productService->listCategories($businessId, $request->branch_id)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'parent_id' => 'nullable|uuid',
            'branch_id' => 'nullable|uuid',
        ]);

        $category = $this->productService->storeCategory($data, $businessId);
        EntityChanged::safe($businessId, 'product_category', 'created', $category->id);
        return response()->json($category, 201);
    }
}
