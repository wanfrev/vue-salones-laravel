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
    public function locations(string $businessId, ?string $branchId = null, ?bool $isDefault = null): Collection
    {
        $query = InventoryLocation::query()
            ->where('business_id', $businessId)
            ->where('active', true)
            ->orderBy('name');

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        if ($isDefault !== null) {
            $query->where('is_default', $isDefault);
        }

        return $query->get();
    }

    public function storeLocation(array $data, string $businessId): InventoryLocation
    {
        return InventoryLocation::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'branch_id' => $data['branch_id'] ?? null,
            'name' => $data['name'],
            'is_default' => $data['is_default'] ?? false,
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function storeStock(array $data, string $businessId): InventoryStock
    {
        return InventoryStock::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'branch_id' => $data['branch_id'] ?? null,
            'location_id' => $data['location_id'],
            'product_id' => $data['product_id'],
            'quantity' => $data['quantity'] ?? 0,
            'updated_at' => now(),
        ]);
    }

    public function updateStock(string $id, array $data): InventoryStock
    {
        $stock = InventoryStock::find($id);
        if (!$stock) throw new NotFoundHttpException('Stock no encontrado.');
        $stock->update(['quantity' => $data['quantity'], 'updated_at' => now()]);
        return $stock;
    }

    public function deleteStock(string $id, string $businessId): void
    {
        $stock = InventoryStock::where('id', $id)->where('business_id', $businessId)->first();
        if (!$stock) throw new NotFoundHttpException('Stock no encontrado.');
        $stock->delete();
    }

    public function index(string $businessId, ?string $branchId = null, ?string $productId = null, ?string $locationId = null): Collection
    {
        $query = InventoryStock::with(['product', 'location'])
            ->where('business_id', $businessId);

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        if ($productId) {
            $query->where('product_id', $productId);
        }

        if ($locationId) {
            $query->where('location_id', $locationId);
        }

        return $query->get()->map(function ($stock) {
            $data = $stock->toArray();
            $data['products'] = $stock->product ? [
                'name' => $stock->product->name,
                'sku' => $stock->product->sku,
                'unit_cost' => $stock->product->unit_cost,
                'unit_price' => $stock->product->unit_price,
                'reorder_point' => $stock->product->reorder_point,
            ] : null;
            return $data;
        });
    }

    public function movements(
        string $businessId,
        ?string $branchId = null,
        ?string $productId = null,
        ?string $startDate = null,
        ?string $endDate = null,
    ): Collection {
        $query = InventoryMovement::with(['product', 'client'])
            ->where('business_id', $businessId)
            ->orderByDesc('created_at');

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }
        if ($productId) $query->where('product_id', $productId);
        if ($startDate) $query->where('created_at', '>=', $startDate);
        if ($endDate) $query->where('created_at', '<=', $endDate);

        return $query->get()->map(function ($movement) {
            $data = $movement->toArray();
            $data['products'] = $movement->product ? ['id' => $movement->product->id, 'name' => $movement->product->name] : null;
            $data['clients'] = $movement->client ? ['full_name' => $movement->client->full_name] : null;
            return $data;
        });
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
            exchangeRateUsed: (float) ($data['exchange_rate_used'] ?? 1),
            clientId: $data['client_id'] ?? null,
        );
    }

    public function getDefaultLocation(string $businessId, ?string $branchId): string
    {
        $query = InventoryLocation::query()
            ->where('business_id', $businessId)
            ->where('is_default', true)
            ->where('active', true);

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        $loc = $query->first();
        if (!$loc) {
            $loc = InventoryLocation::query()
                ->where('business_id', $businessId)
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
        $query = InventoryStock::query()
            ->where('business_id', $businessId)
            ->where('product_id', $productId)
            ->where('location_id', $locationId);

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }
        if ($variantId) $query->where('variant_id', $variantId);
        else $query->whereNull('variant_id');

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
        float $exchangeRateUsed = 1,
        ?string $clientId = null,
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
            'exchange_rate_used' => $exchangeRateUsed,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'notes' => $notes,
            'created_by' => $createdBy,
            'client_id' => $clientId,
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
            'reference_type' => $data['reference_type'] ?? 'direct_sale',
            'reference_id' => $data['reference_id'] ?? null,
            'notes' => $data['notes'] ?? 'Venta de producto',
            'exchange_rate_used' => $data['exchange_rate_used'] ?? $data['exchange_rate'] ?? 1,
            'client_id' => $data['client_id'] ?? null,
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
