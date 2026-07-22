<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\Client;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use RuntimeException;
use Illuminate\Support\Facades\DB;

class PosService
{
    public function __construct(
        private InventoryService $inventoryService,
    ) {}

    /**
     * Appointments pending payment: confirmed/completed but not fully paid.
     * Separated into "realizadas" (past) and "pendientes" (future).
     */
    public function getPendingAppointments(string $businessId, ?string $branchId = null): Collection
    {
        $query = Appointment::with([
            'client',
            'service.linkedProduct',
            'employeeProfile',
            'assistantProfile',
            'transactions',
        ])
            ->where('business_id', $businessId)
            ->whereIn('status', ['confirmed', 'completed', 'pending'])
            ->where('payment_status', '!=', 'paid')
            ->orderBy('start_time');

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        return $query->get();
    }

    /**
     * Products that can be sold at POS (active, sellable, with stock).
     */
    public function getSaleableProducts(string $businessId, ?string $branchId = null): Collection
    {
        $products = Product::with('category')
            ->where('business_id', $businessId)
            ->where('active', true)
            ->where('is_sellable', true)
            ->orderBy('name');

        if ($branchId) {
            $products->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        $products = $products->get();
        $productIds = $products->pluck('id')->toArray();

        if (empty($productIds)) {
            return collect();
        }

        $stockQuery = DB::table('inventory_stock')
            ->select('product_id', DB::raw('SUM(quantity) as total_qty'), DB::raw('COALESCE(SUM(reserved_qty), 0) as total_reserved'))
            ->where('business_id', $businessId)
            ->whereIn('product_id', $productIds)
            ->groupBy('product_id');

        if ($branchId) {
            $stockQuery->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        $stockMap = $stockQuery->get()->keyBy('product_id');

        return $products->map(function (Product $product) use ($stockMap) {
            $stock = $stockMap->get($product->id);
            $available = $stock ? max(0, (float) $stock->total_qty - (float) $stock->total_reserved) : 0;
            $product->available_qty = $available;
            return $product;
        });
    }

    /**
     * Process a sale: appointment payment + optional product sales.
     * - Products sold go 100% to business (no employee commission on products).
     * - Tips go 100% to employee.
     * - Service commission is split per employee/local percentages.
     */
    public function processSale(
        string $appointmentId,
        float $serviceAmount,
        string $method,
        array $products,
        ?string $notes,
        ?float $exchangeRate,
        array $paymentsBreakdown,
        ?float $tipAmount,
        string $businessId,
        string $createdBy,
        float $productsAmount = 0,
    ): string {
        $appointment = Appointment::with(['service', 'employeeProfile'])
            ->findOrFail($appointmentId);

        if ($appointment->business_id !== $businessId) {
            throw new RuntimeException('La cita no pertenece a este negocio.');
        }

        $service = $appointment->service;
        $employee = $appointment->employeeProfile;

        $effectivePrice = $appointment->price_override ?? $service->price ?? $serviceAmount;

        $assistantPct = (float) ($appointment->assistant_percentage ?? 0);

        $employeePct = (float) ($appointment->employee_percentage_override
            ?? $employee?->pay_percentage
            ?? (100 - ($service->local_percentage ?? 50)));

        $localPct = 100 - $employeePct - $assistantPct;

        $tip = $tipAmount ?? 0;

        $rate = $exchangeRate ?: 1;

        if ($localPct < 0) {
            $localPct = 0;
        }

        return DB::transaction(function () use (
            $appointment, $appointmentId, $serviceAmount, $method, $products,
            $notes, $rate, $paymentsBreakdown, $tip, $businessId, $createdBy,
            $employeePct, $localPct, $assistantPct, $effectivePrice, $productsAmount, $service
        ) {
            $totalAmount = $serviceAmount + $productsAmount;

            if ($service->is_fixed_commission && $appointment->employee_percentage_override === null) {
                $employeeAmount = (float) $service->fixed_commission_amount;
                $assistantAmount = (float) $service->fixed_commission_assistant_amount;
                
                // If there's an explicit assistant percentage override in the appointment, use that instead of the fixed assistant amount
                if ($appointment->assistant_percentage !== null) {
                    $assistantAmount = round($serviceAmount * $assistantPct / 100, 2);
                }

                $localAmount = round($totalAmount - $employeeAmount - $assistantAmount, 2);
                
                // Calculate back the percentages for statistics/reporting
                $employeePct = $serviceAmount > 0 ? round(($employeeAmount / $serviceAmount) * 100, 2) : 0;
                $assistantPct = $serviceAmount > 0 ? round(($assistantAmount / $serviceAmount) * 100, 2) : 0;
                $localPct = 100 - $employeePct - $assistantPct;
                if ($localPct < 0) $localPct = 0;
            } else {
                $assistantAmount = round($serviceAmount * $assistantPct / 100, 2);
                $employeeAmount = round($serviceAmount * $employeePct / 100, 2);
                $localAmount = round($totalAmount - $employeeAmount - $assistantAmount, 2);
            }

            $tx = Transaction::create([
                'id' => Str::uuid()->toString(),
                'business_id' => $businessId,
                'branch_id' => $appointment->branch_id,
                'appointment_id' => $appointmentId,
                'total_amount' => $totalAmount,
                'local_amount' => $localAmount,
                'employee_amount' => $employeeAmount,
                'assistant_amount' => $assistantAmount,
                'local_percentage' => $localPct,
                'employee_percentage' => $employeePct,
                'assistant_percentage' => $assistantPct,
                'method' => $method,
                'exchange_rate_used' => $rate,
                'payments_breakdown' => $paymentsBreakdown,
                'created_by' => $createdBy,
                'notes' => $notes,
                'tip_amount' => $tip,
                'paid_at' => now(),
            ]);

            if (!empty($products)) {
                $defaultLocation = $this->inventoryService->getDefaultLocation(
                    $businessId,
                    $appointment->branch_id,
                );

                foreach ($products as $product) {
                    $this->validateAndDeductStock(
                        $businessId,
                        $product['product_id'],
                        $product['variant_id'] ?? null,
                        $product['quantity'] ?? 1,
                        $product['name'] ?? $product['product_id'],
                        $appointment->branch_id,
                        $defaultLocation,
                    );

                    $unitCost = (float) ($product['unit_cost'] ?? 0);

                    $this->inventoryService->recordMovement(
                        businessId: $businessId,
                        locationId: $product['location_id'] ?? $defaultLocation,
                        productId: $product['product_id'],
                        variantId: $product['variant_id'] ?? null,
                        movementType: 'sale',
                        quantity: -($product['quantity'] ?? 1),
                        unitCost: $unitCost,
                        referenceType: 'appointment',
                        referenceId: $appointmentId,
                        notes: 'Venta en punto de venta — cita',
                        createdBy: $createdBy,
                        branchId: $appointment->branch_id,
                        exchangeRateUsed: $rate,
                        clientId: $appointment->client_id,
                    );
                }
            }

            if ($service->linked_product_id) {
                $defaultLocation = $defaultLocation ?? $this->inventoryService->getDefaultLocation(
                    $businessId,
                    $appointment->branch_id,
                );

                $linkedProduct = \App\Models\Product::find($service->linked_product_id);
                $linkedProductName = $linkedProduct ? $linkedProduct->name : 'Producto Insumo';

                $this->validateAndDeductStock(
                    $businessId,
                    $service->linked_product_id,
                    $service->linked_variant_id,
                    1,
                    $linkedProductName,
                    $appointment->branch_id,
                    $defaultLocation,
                );

                $this->inventoryService->recordMovement(
                    businessId: $businessId,
                    locationId: $defaultLocation,
                    productId: $service->linked_product_id,
                    variantId: $service->linked_variant_id,
                    movementType: 'consumption',
                    quantity: -1,
                    unitCost: $linkedProduct ? (float) $linkedProduct->unit_cost : 0,
                    referenceType: 'appointment',
                    referenceId: $appointmentId,
                    notes: "Consumo automático por servicio: {$service->name}",
                    createdBy: $createdBy,
                    branchId: $appointment->branch_id,
                    exchangeRateUsed: $rate,
                    clientId: $appointment->client_id,
                );
            }

            $paidSoFar = Transaction::where('appointment_id', $appointmentId)
                ->sum('total_amount');

            $paymentStatus = match (true) {
                $paidSoFar >= $effectivePrice => 'paid',
                $paidSoFar > 0 => 'partial',
                default => 'unpaid',
            };

            $appointment->update(['payment_status' => $paymentStatus]);

            return $tx->id;
        });
    }

    /**
     * Direct product sale — no appointment, no employee commission.
     * All revenue goes to the business.
     */
    public function processDirectSale(
        float $totalAmount,
        string $method,
        array $products,
        ?string $notes,
        ?float $exchangeRate,
        array $paymentsBreakdown,
        ?string $clientId,
        string $businessId,
        ?string $branchId,
        string $createdBy,
    ): string {
        if (empty($products)) {
            throw new RuntimeException('La venta directa requiere al menos un producto.');
        }

        $rate = $exchangeRate ?: 1;

        $clientName = null;
        if ($clientId) {
            $client = Client::where('business_id', $businessId)->find($clientId);
            $clientName = $client?->full_name;
        }

        return DB::transaction(function () use (
            $totalAmount, $method, $products, $notes, $rate,
            $paymentsBreakdown, $clientId, $businessId, $branchId, $createdBy, $clientName
        ) {
            $tx = Transaction::create([
                'id' => Str::uuid()->toString(),
                'business_id' => $businessId,
                'branch_id' => $branchId,
                'appointment_id' => null,
                'total_amount' => $totalAmount,
                'local_amount' => $totalAmount,
                'employee_amount' => 0,
                'assistant_amount' => 0,
                'local_percentage' => 100,
                'employee_percentage' => 0,
                'assistant_percentage' => 0,
                'method' => $method,
                'exchange_rate_used' => $rate,
                'payments_breakdown' => $paymentsBreakdown,
                'created_by' => $createdBy,
                'notes' => $notes ?? ($clientName ? "Venta directa — {$clientName}" : 'Venta directa'),
                'tip_amount' => 0,
                'paid_at' => now(),
            ]);

            $defaultLocation = $this->inventoryService->getDefaultLocation(
                $businessId,
                $branchId,
            );

            foreach ($products as $product) {
                $this->validateAndDeductStock(
                    $businessId,
                    $product['product_id'],
                    $product['variant_id'] ?? null,
                    $product['quantity'] ?? 1,
                    $product['name'] ?? $product['product_id'],
                    $branchId,
                    $defaultLocation,
                );

                $unitCost = (float) ($product['unit_cost'] ?? 0);

                $this->inventoryService->recordMovement(
                    businessId: $businessId,
                    locationId: $product['location_id'] ?? $defaultLocation,
                    productId: $product['product_id'],
                    variantId: $product['variant_id'] ?? null,
                    movementType: 'sale',
                    quantity: -($product['quantity'] ?? 1),
                    unitCost: $unitCost,
                    referenceType: 'direct',
                    referenceId: $tx->id,
                    notes: $clientName
                        ? "Venta directa — {$clientName}"
                        : 'Venta directa — Mostrador',
                    createdBy: $createdBy,
                    branchId: $branchId,
                    exchangeRateUsed: $rate,
                    clientId: $clientId,
                );
            }

            return $tx->id;
        });
    }

    private function validateAndDeductStock(
        string $businessId,
        string $productId,
        ?string $variantId,
        int $quantity,
        string $productName,
        ?string $branchId,
        string $defaultLocation,
    ): void {
        $stock = \App\Models\InventoryStock::where('business_id', $businessId)
            ->where('product_id', $productId)
            ->where('location_id', $defaultLocation)
            ->when($variantId, fn($q) => $q->where('variant_id', $variantId), fn($q) => $q->whereNull('variant_id'))
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->lockForUpdate()
            ->first();

        if (!$stock || $stock->quantity < $quantity) {
            throw new RuntimeException("Stock insuficiente para {$productName}. Disponible: " . ($stock->quantity ?? 0));
        }

        $stock->quantity -= $quantity;
        $stock->save();
    }
}
