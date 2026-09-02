<?php

namespace App\Services;

use App\Models\PurchaseInvoice;
use App\Models\PurchaseInvoiceItem;
use App\Models\Supplier;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Registers a supplier invoice being received into inventory: one header (proveedor, número de
 * factura) plus N lines (producto existente o nuevo, cantidad, costo). Every line both creates a
 * PurchaseInvoiceItem row (so the invoice can be reprinted/audited later against the physical
 * paper) and calls InventoryService::adjust() to bump stock and leave the matching
 * InventoryMovement — the same kardex "Movimientos" already shows for every other stock change.
 */
class PurchaseInvoiceService
{
    public function __construct(
        private InventoryService $inventory,
        private ProductService $products,
    ) {}

    public function list(string $businessId, ?string $supplierId = null): Collection
    {
        $query = PurchaseInvoice::with(['supplier', 'creator', 'items.product'])
            ->where('business_id', $businessId)
            ->orderByDesc('invoice_date')
            ->orderByDesc('created_at');

        if ($supplierId) {
            $query->where('supplier_id', $supplierId);
        }

        return $query->get();
    }

    public function find(string $id, string $businessId): PurchaseInvoice
    {
        $invoice = PurchaseInvoice::with(['supplier', 'creator', 'items.product'])->find($id);
        if (!$invoice || $invoice->business_id !== $businessId) {
            throw new NotFoundHttpException('Factura no encontrada.');
        }

        return $invoice;
    }

    /**
     * @param array{
     *   supplier_id?: string|null,
     *   invoice_number: string,
     *   invoice_date: string,
     *   branch_id?: string|null,
     *   notes?: string|null,
     *   items: list<array{
     *     product_id?: string|null,
     *     new_product?: array{name: string, sku?: string|null, unit?: string|null, unit_price?: float|null, unit_price_2?: float|null},
     *     quantity: float,
     *     unit_cost?: float
     *   }>
     * } $data
     */
    public function create(array $data, string $businessId, string $createdBy): PurchaseInvoice
    {
        return DB::transaction(function () use ($data, $businessId, $createdBy) {
            $invoice = PurchaseInvoice::create([
                'id' => Str::uuid()->toString(),
                'business_id' => $businessId,
                'branch_id' => $data['branch_id'] ?? null,
                'supplier_id' => $data['supplier_id'] ?? null,
                'invoice_number' => $data['invoice_number'],
                'invoice_date' => $data['invoice_date'],
                'total' => 0,
                'notes' => $data['notes'] ?? null,
                'created_by' => $createdBy,
            ]);

            $total = 0.0;

            foreach ($data['items'] as $itemData) {
                $productId = $itemData['product_id'] ?? null;

                if (!$productId) {
                    $newProductData = $itemData['new_product'] ?? [];
                    if (empty($newProductData['name'])) {
                        throw new RuntimeException('Cada línea necesita un producto existente o el nombre de un producto nuevo.');
                    }
                    $product = $this->products->store([
                        'name' => $newProductData['name'],
                        'sku' => $newProductData['sku'] ?? null,
                        'unit' => $newProductData['unit'] ?? 'unidad',
                        'unit_cost' => $itemData['unit_cost'] ?? 0,
                        'unit_price' => $newProductData['unit_price'] ?? 0,
                        'unit_price_2' => $newProductData['unit_price_2'] ?? null,
                        'branch_id' => $data['branch_id'] ?? null,
                    ], $businessId);
                    $productId = $product->id;
                }

                $quantity = (float) $itemData['quantity'];
                $unitCost = (float) ($itemData['unit_cost'] ?? 0);
                $lineTotal = round($quantity * $unitCost, 2);
                $total += $lineTotal;

                PurchaseInvoiceItem::create([
                    'id' => Str::uuid()->toString(),
                    'purchase_invoice_id' => $invoice->id,
                    'product_id' => $productId,
                    'quantity' => $quantity,
                    'unit_cost' => $unitCost,
                    'line_total' => $lineTotal,
                ]);

                $this->inventory->adjust([
                    'product_id' => $productId,
                    'quantity' => $quantity,
                    'branch_id' => $data['branch_id'] ?? null,
                    'unit_cost' => $unitCost,
                    'reference_type' => 'purchase_invoice',
                    'reference_id' => $invoice->id,
                    'notes' => "Factura de compra #{$invoice->invoice_number}",
                ], $businessId, $createdBy);

                // Last-cost basis: receiving merchandise updates what the product currently costs.
                if ($unitCost > 0) {
                    \App\Models\Product::where('id', $productId)
                        ->where('business_id', $businessId)
                        ->update(['unit_cost' => $unitCost]);
                }
            }

            $invoice->update(['total' => $total]);

            if (!empty($data['supplier_id']) && $total > 0) {
                $supplier = Supplier::where('id', $data['supplier_id'])
                    ->where('business_id', $businessId)
                    ->lockForUpdate()
                    ->first();

                if ($supplier) {
                    $supplier->increment('total_debt', $total);
                    if ($supplier->debt_currency === 'VES' && $supplier->debt_exchange_rate > 0) {
                        $supplier->increment('debt_original_amount', round($total * $supplier->debt_exchange_rate, 2));
                    } else {
                        $supplier->increment('debt_original_amount', $total);
                    }
                }
            }

            return $invoice->fresh(['supplier', 'creator', 'items.product']);
        });
    }
}
