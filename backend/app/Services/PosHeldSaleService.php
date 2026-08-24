<?php

namespace App\Services;

use App\Models\InventoryStock;
use App\Models\PosHeldSale;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * "Compras en espera" (tienda POS) — park an in-progress retail sale (cart snapshot) so the
 * cashier can serve someone else, and resume it later exactly as it was left. Reuses
 * inventory_stock.reserved_qty, which already feeds the `available_qty = quantity - reserved_qty`
 * formula in PosService::getSaleableProducts() but is never written anywhere else today.
 */
class PosHeldSaleService
{
    public function __construct(
        private InventoryService $inventoryService,
    ) {}

    public function list(string $businessId, ?string $branchId = null): Collection
    {
        $query = PosHeldSale::where('business_id', $businessId)->orderByDesc('created_at');

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        return $query->get();
    }

    public function hold(string $businessId, ?string $branchId, ?string $createdBy, array $data): PosHeldSale
    {
        $cart = $data['cart'] ?? [];
        if (empty($cart)) {
            throw new RuntimeException('No hay productos para poner en espera.');
        }

        return DB::transaction(function () use ($businessId, $branchId, $createdBy, $data, $cart) {
            $defaultLocation = $this->inventoryService->getDefaultLocation($businessId, $branchId);

            foreach ($cart as $item) {
                $this->reserveStock($businessId, $branchId, $defaultLocation, $item);
            }

            $total = array_reduce($cart, function ($sum, $item) {
                return $sum + (float) ($item['unitPrice'] ?? 0) * (float) ($item['quantity'] ?? 0);
            }, 0.0);

            return PosHeldSale::create([
                'id' => Str::uuid()->toString(),
                'business_id' => $businessId,
                'branch_id' => $branchId,
                'created_by' => $createdBy,
                'client_id' => $data['client_id'] ?? null,
                'client_name' => $data['client_name'] ?? null,
                'client_phone' => $data['client_phone'] ?? null,
                'cart' => $cart,
                'payment_method' => $data['payment_method'] ?? null,
                'payment_currency' => $data['payment_currency'] ?? null,
                'payments_breakdown' => $data['payments_breakdown'] ?? [],
                'tip_amount' => $data['tip_amount'] ?? 0,
                'tip_currency' => $data['tip_currency'] ?? null,
                'notes' => $data['notes'] ?? null,
                'custom_total_amount' => $data['custom_total_amount'] ?? null,
                'custom_total_currency' => $data['custom_total_currency'] ?? null,
                'are_products_included' => $data['are_products_included'] ?? false,
                'total_amount' => round($total, 2),
            ]);
        });
    }

    public function resume(string $id, string $businessId): PosHeldSale
    {
        return DB::transaction(function () use ($id, $businessId) {
            $held = PosHeldSale::where('business_id', $businessId)->lockForUpdate()->find($id);
            if (!$held) {
                throw new RuntimeException('Venta en espera no encontrada.');
            }

            $defaultLocation = $this->inventoryService->getDefaultLocation($businessId, $held->branch_id);
            foreach ($held->cart as $item) {
                $this->releaseStock($businessId, $held->branch_id, $defaultLocation, $item);
            }

            $held->delete();

            return $held;
        });
    }

    public function cancel(string $id, string $businessId): void
    {
        DB::transaction(function () use ($id, $businessId) {
            $held = PosHeldSale::where('business_id', $businessId)->lockForUpdate()->find($id);
            if (!$held) {
                throw new RuntimeException('Venta en espera no encontrada.');
            }

            $defaultLocation = $this->inventoryService->getDefaultLocation($businessId, $held->branch_id);
            foreach ($held->cart as $item) {
                $this->releaseStock($businessId, $held->branch_id, $defaultLocation, $item);
            }

            $held->delete();
        });
    }

    private function findStockRow(string $businessId, ?string $branchId, string $defaultLocation, array $item): ?InventoryStock
    {
        $productId = $item['productId'] ?? null;
        if (!$productId) {
            return null;
        }
        $variantId = $item['variantId'] ?? null;

        $query = InventoryStock::where('business_id', $businessId)
            ->where('product_id', $productId)
            ->when($variantId, fn($q) => $q->where('variant_id', $variantId), fn($q) => $q->whereNull('variant_id'));

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        return (clone $query)->where('location_id', $defaultLocation)->lockForUpdate()->first()
            ?? $query->lockForUpdate()->first();
    }

    private function reserveStock(string $businessId, ?string $branchId, string $defaultLocation, array $item): void
    {
        $quantity = (float) ($item['quantity'] ?? 0);
        if ($quantity <= 0) {
            return;
        }

        $stock = $this->findStockRow($businessId, $branchId, $defaultLocation, $item);
        $name = $item['productName'] ?? ($item['productId'] ?? 'producto');

        if (!$stock || ($stock->quantity - $stock->reserved_qty) < $quantity) {
            $avail = $stock ? max(0, $stock->quantity - $stock->reserved_qty) : 0;
            throw new RuntimeException("Sin stock suficiente para poner en espera \"{$name}\". Disponible: {$avail}");
        }

        $stock->reserved_qty += $quantity;
        $stock->save();
    }

    private function releaseStock(string $businessId, ?string $branchId, string $defaultLocation, array $item): void
    {
        $quantity = (float) ($item['quantity'] ?? 0);
        if ($quantity <= 0) {
            return;
        }

        $stock = $this->findStockRow($businessId, $branchId, $defaultLocation, $item);
        if (!$stock) {
            return;
        }

        $stock->reserved_qty = max(0, $stock->reserved_qty - $quantity);
        $stock->save();
    }
}
