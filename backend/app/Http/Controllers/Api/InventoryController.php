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

    public function index(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json([]);

        return response()->json(
            $this->inventoryService->index($p->business_id, $request->branch_id)
        );
    }

    public function movements(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json([]);

        return response()->json(
            $this->inventoryService->movements(
                $p->business_id,
                $request->branch_id,
                $request->product_id,
                $request->start_date,
                $request->end_date,
            )
        );
    }

    public function adjust(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

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
            $movement = $this->inventoryService->adjust($data, $p->business_id, $user->id);
            EntityChanged::dispatch($p->business_id, 'inventory', 'updated', $movement->id);
            return response()->json($movement, 201);
        } catch (\Throwable $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 400);
        }
    }

    public function sell(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'product_id' => 'required|uuid',
            'variant_id' => 'nullable|uuid',
            'quantity' => 'required|numeric|min:0.01',
            'location_id' => 'nullable|uuid',
            'branch_id' => 'nullable|uuid',
            'unit_cost' => 'nullable|numeric|min:0',
            'reference_id' => 'nullable|uuid',
            'notes' => 'nullable|string',
        ]);

        try {
            $movement = $this->inventoryService->sellProduct($data, $p->business_id, $user->id);
            EntityChanged::dispatch($p->business_id, 'inventory', 'updated', $movement->id);
            return response()->json($movement, 201);
        } catch (\Throwable $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 400);
        }
    }
}
