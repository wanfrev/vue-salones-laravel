<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Services\SupplierService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController
{
    public function __construct(
        private SupplierService $supplierService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json([]);

        $active = null;
        if ($request->has('active')) {
            $active = filter_var($request->input('active'), FILTER_VALIDATE_BOOL);
        }

        return response()->json(
            $this->supplierService->list($p->business_id, $request->branch_id, $active)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);

        $data = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'company' => 'nullable|string|max:255',
            'total_debt' => 'nullable|numeric|min:0',
            'debt_currency' => 'nullable|in:USD,VES',
            'debt_original_amount' => 'nullable|numeric|min:0',
            'debt_exchange_rate' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'branch_id' => 'nullable|uuid',
        ]);

        $supplier = $this->supplierService->store($data, $p->business_id);
        EntityChanged::safe($p->business_id, 'supplier', 'created', $supplier->id);
        return response()->json($supplier, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $data = $request->validate([
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'company' => 'nullable|string|max:255',
            'total_debt' => 'nullable|numeric|min:0',
            'debt_currency' => 'nullable|in:USD,VES',
            'debt_original_amount' => 'nullable|numeric|min:0',
            'debt_exchange_rate' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'active' => 'boolean',
        ]);

        $supplier = $this->supplierService->update($id, $data, $p?->business_id);
        EntityChanged::safe($p->business_id, 'supplier', 'updated', $id);
        return response()->json($supplier);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;

        $this->supplierService->destroy($id, $p?->business_id);
        EntityChanged::safe($p->business_id, 'supplier', 'deleted', $id);
        return response()->json(null, 204);
    }

    public function balance(string $id): JsonResponse
    {
        $user = request()->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) return response()->json([]);

        return response()->json($this->supplierService->getBalance($id, $p->business_id));
    }
}
