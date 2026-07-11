<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryController
{
    public function __construct(
        private InventoryService $inventoryService,
    ) {}

    private function resolveBusinessId(Request $request): ?string
    {
        return $request->user()?->profile?->business_id;
    }

    public function variants(Request $request): JsonResponse
    {
        return response()->json([]);
    }

    public function locations(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json([]);

        $isDefault = null;
        if ($request->has('is_default')) {
            $isDefault = filter_var($request->input('is_default'), FILTER_VALIDATE_BOOL);
        }

        return response()->json(
            $this->inventoryService->locations($businessId, $request->branch_id, $isDefault)
        );
    }

    public function storeLocation(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'is_default' => 'boolean',
            'branch_id' => 'nullable|uuid',
        ]);

        $location = $this->inventoryService->storeLocation($data, $businessId);
        return response()->json($location, 201);
    }

    public function storeStock(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'product_id' => 'required|uuid',
            'location_id' => 'required|uuid',
            'quantity' => 'required|numeric|min:0',
            'branch_id' => 'nullable|uuid',
        ]);

        $stock = $this->inventoryService->storeStock($data, $businessId);
        return response()->json($stock, 201);
    }

    public function updateStock(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'quantity' => 'required|numeric|min:0',
        ]);

        $stock = $this->inventoryService->updateStock($id, $data);
        return response()->json($stock);
    }

    public function storeMovement(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'product_id' => 'required|uuid',
            'location_id' => 'required|uuid',
            'quantity' => 'required|numeric|not_in:0',
            'movement_type' => 'required|string',
            'variant_id' => 'nullable|uuid',
            'unit_cost' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'branch_id' => 'nullable|uuid',
            'reference_type' => 'nullable|string|max:50',
            'reference_id' => 'nullable|string',
            'currency' => 'nullable|string',
            'exchange_rate_used' => 'nullable|numeric|min:0',
            'exchange_rate' => 'nullable|numeric|min:0',
            'client_id' => 'nullable|uuid',
        ]);

        $movement = $this->inventoryService->recordMovement(
            $businessId,
            $data['location_id'],
            $data['product_id'],
            $data['variant_id'] ?? null,
            $data['movement_type'],
            (float) $data['quantity'],
            (float) ($data['unit_cost'] ?? 0),
                $data['reference_type'] ?? null,
            $data['reference_id'] ?? null,
            $data['notes'] ?? null,
            $request->user()->id,
            $data['branch_id'] ?? null,
                (float) ($data['exchange_rate_used'] ?? $data['exchange_rate'] ?? 1),
                $data['client_id'] ?? null,
        );
        return response()->json($movement, 201);
    }

    public function deleteStock(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        $this->inventoryService->deleteStock($id, $businessId);
        return response()->json(null, 204);
    }

    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json([]);

        return response()->json(
            $this->inventoryService->index(
                $businessId,
                $request->branch_id,
                $request->product_id,
                $request->location_id
            )
        );
    }

    public function movements(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json([]);

        return response()->json(
            $this->inventoryService->movements(
                $businessId, $request->branch_id,
                $request->product_id, $request->start_date, $request->end_date,
            )
        );
    }

    public function adjust(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'product_id' => 'required|uuid',
            'variant_id' => 'nullable|uuid',
            'quantity' => 'required|numeric|not_in:0',
            'location_id' => 'nullable|uuid',
            'branch_id' => 'nullable|uuid',
            'unit_cost' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        try {
            $movement = $this->inventoryService->adjust($data, $businessId, $request->user()->id);
            EntityChanged::safe($businessId, 'inventory', 'updated', $movement->id);
            return response()->json($movement, 201);
        } catch (\Throwable $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 400);
        }
    }

    public function sell(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'product_id' => 'required|uuid',
            'variant_id' => 'nullable|uuid',
            'quantity' => 'required|numeric|min:0.01',
            'location_id' => 'nullable|uuid',
            'branch_id' => 'nullable|uuid',
            'unit_cost' => 'nullable|numeric|min:0',
            'reference_id' => 'nullable|uuid',
            'reference_type' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
            'client_id' => 'nullable|uuid',
            'exchange_rate_used' => 'nullable|numeric|min:0',
            'exchange_rate' => 'nullable|numeric|min:0',
        ]);

        try {
            $movement = $this->inventoryService->sellProduct($data, $businessId, $request->user()->id);
            EntityChanged::safe($businessId, 'inventory', 'updated', $movement->id);
            return response()->json($movement, 201);
        } catch (\Throwable $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 400);
        }
    }
}
