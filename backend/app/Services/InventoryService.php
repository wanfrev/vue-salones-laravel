<?php

namespace App\Services;

use App\Models\InventoryLocation;
use App\Models\InventoryMovement;
use App\Models\InventoryStock;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use RuntimeException;

class InventoryService
{
    public function index(string $businessId, ?string $branchId = null): Collection
    {
        $query = InventoryStock::with(['product', 'location'])
            ->where('business_id', $businessId);

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        return $query->get();
    }

    public function movements(
        string $businessId,
        ?string $branchId = null,
        ?string $productId = null,
        ?string $startDate = null,
        ?string $endDate = null,
    ): Collection {
        $query = InventoryMovement::where('business_id', $businessId)
            ->orderByDesc('created_at');

        if ($branchId) $query->where('branch_id', $branchId);
        if ($productId) $query->where('product_id', $productId);
        if ($startDate) $query->where('created_at', '>=', $startDate);
        if ($endDate) $query->where('created_at', '<=', $endDate);

        return $query->get();
    }

    public function adjust(array $data, string $businessId, string $createdBy): InventoryMovement
    {
        $locationId = $data['location_id'] ?? $this->getDefaultLocation($businessId, $data['branch_id'] ?? null);
        $productId = $data['product_id'];
        $variantId = $data['variant_id'] ?? null;
        $quantity = $data['quantity'];

        $stock = $this->getStockRecord($businessId, $productId, $locationId, $variantId, $data['branch_id'] ?? null);

        if ($stock) {
            $newQty = $stock->quantity + $quantity;
            if ($newQty < 0) throw new RuntimeException('Stock insuficiente para ajuste negativo.');
            $this->updateStockQuantity($stock->id, $newQty);
        } else {
            if ($quantity < 0) throw new RuntimeException('No hay stock para reducir.');
            $this->insertStockRecord($businessId, $locationId, $productId, $variantId, $quantity, $data['branch_id'] ?? null);
        }

        return $this->recordMovement(
            businessId: $businessId,
            locationId: $locationId,
            productId: $productId,
            variantId: $variantId,
            movementType: 'adjustment',
            quantity: $quantity,
            unitCost: $data['unit_cost'] ?? 0,
            referenceType: $data['reference_type'] ?? null,
            referenceId: $data['reference_id'] ?? null,
            notes: $data['notes'] ?? null,
            createdBy: $createdBy,
            branchId: $data['branch_id'] ?? null,
        );
    }

    public function getDefaultLocation(string $businessId, ?string $branchId): string
    {
        $query = InventoryLocation::where('business_id', $businessId)
            ->where('is_default', true)
            ->where('active', true);

        if ($branchId) $query->where('branch_id', $branchId);

        $loc = $query->first();
        if (!$loc) {
            $loc = InventoryLocation::where('business_id', $businessId)
                ->where('active', true)
                ->first();
        }

        if (!$loc) {
            $loc = InventoryLocation::create([
                'id' => Str::uuid()->toString(),
                'business_id' => $businessId,
                'branch_id' => $branchId,
                'name' => 'Principal',
                'is_default' => true,
                'active' => true,
                'metadata' => [],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return $loc->id;
    }

    public function getStockRecord(
        string $businessId,
        string $productId,
        string $locationId,
        ?string $variantId = null,
        ?string $branchId = null,
    ): ?InventoryStock {
        $query = InventoryStock::where('business_id', $businessId)
            ->where('product_id', $productId)
            ->where('location_id', $locationId);

        if ($variantId) $query->where('variant_id', $variantId);
        else $query->whereNull('variant_id');
        if ($branchId) $query->where('branch_id', $branchId);

        return $query->first();
    }

    public function updateStockQuantity(string $stockId, float $newQuantity): void
    {
        InventoryStock::where('id', $stockId)->update([
            'quantity' => $newQuantity,
            'updated_at' => now(),
        ]);
    }

    public function insertStockRecord(
        string $businessId,
        string $locationId,
        string $productId,
        ?string $variantId,
        float $quantity,
        ?string $branchId,
    ): InventoryStock {
        return InventoryStock::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'branch_id' => $branchId,
            'location_id' => $locationId,
            'product_id' => $productId,
            'variant_id' => $variantId,
            'quantity' => $quantity,
            'reserved_qty' => 0,
            'updated_at' => now(),
        ]);
    }

    public function recordMovement(
        string $businessId,
        string $locationId,
        string $productId,
        ?string $variantId,
        string $movementType,
        float $quantity,
        float $unitCost = 0,
        ?string $referenceType = null,
        ?string $referenceId = null,
        ?string $notes = null,
        ?string $createdBy = null,
        ?string $branchId = null,
    ): InventoryMovement {
        return InventoryMovement::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'branch_id' => $branchId,
            'location_id' => $locationId,
            'product_id' => $productId,
            'variant_id' => $variantId,
            'movement_type' => $movementType,
            'quantity' => $quantity,
            'unit_cost' => $unitCost,
            'exchange_rate_used' => 1,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'notes' => $notes,
            'created_by' => $createdBy,
            'created_at' => now(),
        ]);
    }

    public function sellProduct(array $data, string $businessId, string $createdBy): InventoryMovement
    {
        return $this->adjust([
            'product_id' => $data['product_id'],
            'variant_id' => $data['variant_id'] ?? null,
            'quantity' => -abs($data['quantity']),
            'location_id' => $data['location_id'] ?? null,
            'branch_id' => $data['branch_id'] ?? null,
            'unit_cost' => $data['unit_cost'] ?? 0,
            'reference_type' => 'appointment',
            'reference_id' => $data['reference_id'] ?? null,
            'notes' => $data['notes'] ?? 'Venta de producto',
        ], $businessId, $createdBy);
    }

    public function deleteProductSale(string $movementId, string $businessId, string $createdBy): void
    {
        $movement = InventoryMovement::find($movementId);
        if (!$movement || $movement->business_id !== $businessId) {
            throw new NotFoundHttpException('Movimiento no encontrado.');
        }

        $this->adjust([
            'product_id' => $movement->product_id,
            'variant_id' => $movement->variant_id,
            'quantity' => abs($movement->quantity),
            'location_id' => $movement->location_id,
            'branch_id' => $movement->branch_id,
            'unit_cost' => $movement->unit_cost,
            'reference_type' => 'correction',
            'reference_id' => $movement->id,
            'notes' => 'Corrección de venta eliminada',
        ], $businessId, $createdBy);

        $movement->delete();
    }

    public function getLowStockProducts(): Collection
    {
        return \App\Models\Product::where('active', true)
            ->where('is_sellable', true)
            ->where('reorder_point', '>', 0)
            ->whereHas('stocks')
            ->withSum('stocks', 'quantity')
            ->get()
            ->filter(fn($p) => $p->stocks_sum_quantity <= $p->reorder_point)
            ->map(fn($p) => (object) [
                'business_id' => $p->business_id,
                'id' => $p->id,
                'name' => $p->name,
                'reorder_point' => $p->reorder_point,
                'total_stock' => $p->stocks_sum_quantity,
            ])
            ->values();
    }
}
