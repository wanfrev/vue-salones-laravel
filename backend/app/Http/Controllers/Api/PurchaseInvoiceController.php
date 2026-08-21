<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Services\PurchaseInvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PurchaseInvoiceController
{
    public function __construct(
        private PurchaseInvoiceService $purchaseInvoices,
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
            $this->purchaseInvoices->list($businessId, $request->supplier_id)
        );
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        return response()->json($this->purchaseInvoices->find($id, $businessId));
    }

    public function store(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'supplier_id' => 'nullable|uuid',
            'invoice_number' => 'required|string|max:100',
            'invoice_date' => 'required|date',
            'branch_id' => 'nullable|uuid',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|uuid',
            'items.*.new_product' => 'nullable|array',
            // Not required_without:items.*.product_id here — Laravel's wildcard validator
            // doesn't reliably cross-reference sibling wildcard fields per-index. The service
            // enforces "product_id or a named new_product" itself and throws a clean 422 below.
            'items.*.new_product.name' => 'nullable|string|max:255',
            'items.*.new_product.sku' => 'nullable|string|max:100',
            'items.*.new_product.unit' => 'nullable|string|max:50',
            'items.*.new_product.unit_price' => 'nullable|numeric|min:0',
            'items.*.new_product.unit_price_2' => 'nullable|numeric|min:0',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_cost' => 'nullable|numeric|min:0',
        ]);

        try {
            $invoice = $this->purchaseInvoices->create($data, $businessId, $request->user()->id);
        } catch (\Throwable $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 422);
        }

        EntityChanged::safe($businessId, 'purchase_invoice', 'created', $invoice->id);
        EntityChanged::safe($businessId, 'inventory', 'updated');

        return response()->json($invoice, 201);
    }
}
