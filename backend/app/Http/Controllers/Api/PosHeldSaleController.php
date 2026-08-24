<?php

namespace App\Http\Controllers\Api;

use App\Services\PosHeldSaleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PosHeldSaleController
{
    public function __construct(
        private PosHeldSaleService $heldSaleService,
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

    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json([]);

        return response()->json(
            $this->heldSaleService->list($businessId, $request->get('branch_id'))
        );
    }

    public function store(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['message' => 'Sin negocio asignado.'], 403);

        $data = $request->validate([
            'branch_id' => 'nullable|uuid',
            'client_id' => 'nullable|uuid',
            'client_name' => 'nullable|string|max:255',
            'client_phone' => 'nullable|string|max:50',
            'cart' => 'required|array|min:1',
            'payment_method' => 'nullable|string|max:50',
            'payment_currency' => 'nullable|in:USD,VES',
            'payments_breakdown' => 'nullable|array',
            'tip_amount' => 'nullable|numeric|min:0',
            'tip_currency' => 'nullable|in:USD,VES',
            'notes' => 'nullable|string|max:500',
            'custom_total_amount' => 'nullable|numeric|min:0',
            'custom_total_currency' => 'nullable|in:USD,VES',
            'are_products_included' => 'nullable|boolean',
        ]);

        try {
            $held = $this->heldSaleService->hold(
                $businessId,
                $data['branch_id'] ?? $request->get('branch_id'),
                $request->user()->id,
                $data,
            );

            return response()->json($held, 201);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function resume(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['message' => 'Sin negocio asignado.'], 403);

        try {
            $held = $this->heldSaleService->resume($id, $businessId);
            return response()->json($held);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function cancel(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['message' => 'Sin negocio asignado.'], 403);

        try {
            $this->heldSaleService->cancel($id, $businessId);
            return response()->json(['success' => true]);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }
}
