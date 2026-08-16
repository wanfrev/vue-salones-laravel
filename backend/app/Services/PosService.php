<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Credit;
use App\Models\DailyReport;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\Client;
use Carbon\Carbon;
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
        $serviceRelations = ['service.linkedProduct'];
        if (\Illuminate\Support\Facades\Schema::hasTable('service_products')) {
            $serviceRelations[] = 'service.linkedProducts.product';
        }

        $query = Appointment::with(array_merge([
            'client',
            'employeeProfile',
            'assistantProfile',
            'transactions',
        ], $serviceRelations))
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

            $totalAmount = $serviceAmount + $productsAmount;

            // 1. Employee Amount Calculation
            if ($appointment->employee_amount_override !== null) {
                $employeeAmount = (float) $appointment->employee_amount_override;
            } elseif ($appointment->employee_percentage_override !== null) {
                $employeeAmount = round($serviceAmount * $employeePct / 100, 2);
            } elseif ($service->is_fixed_commission) {
                $employeeAmount = (float) $service->fixed_commission_amount;
            } else {
                $employeeAmount = round($serviceAmount * $employeePct / 100, 2);
            }

            // 2. Assistant Amount Calculation
            if ($appointment->assistant_amount_override !== null) {
                $assistantAmount = (float) $appointment->assistant_amount_override;
            } elseif ($appointment->assistant_percentage !== null && $appointment->assistant_percentage > 0) {
                $assistantAmount = round($serviceAmount * $assistantPct / 100, 2);
            } elseif ($service->is_fixed_commission) {
                $assistantAmount = (float) $service->fixed_commission_assistant_amount;
            } else {
                $assistantAmount = round($serviceAmount * $assistantPct / 100, 2);
            }

            $localAmount = round($totalAmount - $employeeAmount - $assistantAmount, 2);

            $employeePct = $serviceAmount > 0 ? round(($employeeAmount / $serviceAmount) * 100, 2) : 0;
            $assistantPct = $serviceAmount > 0 ? round(($assistantAmount / $serviceAmount) * 100, 2) : 0;
            $localPct = 100 - $employeePct - $assistantPct;
            if ($localPct < 0) $localPct = 0;

            $receiptCode = null;
            $business = \App\Models\Business::find($businessId);
            if ($business && in_array($business->niche_type, ['tienda', 'retail'])) {
                $lastCode = Transaction::where('business_id', $businessId)
                    ->whereNotNull('receipt_code')
                    ->lockForUpdate()
                    ->max('receipt_code');
                
                if ($lastCode) {
                    $num = (int) substr($lastCode, 1);
                    $receiptCode = 'B' . str_pad($num + 1, 4, '0', STR_PAD_LEFT);
                } else {
                    $receiptCode = 'B0001';
                }
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
                'receipt_code' => $receiptCode,
                'created_by' => $createdBy,
                'notes' => $notes,
                'tip_amount' => $tip,
                'paid_at' => now(),
            ]);

            if (is_array($paymentsBreakdown)) {
                foreach ($paymentsBreakdown as $split) {
                    if (isset($split['method']) && $split['method'] === 'gift_card') {
                        $gcId = $split['gift_card_id'] ?? $split['giftCardId'] ?? null;
                        $gc = null;
                        if (!empty($gcId)) {
                            $gc = \App\Models\GiftCard::find($gcId);
                        }
                        if (!$gc && !empty($businessId)) {
                            $gc = \App\Models\GiftCard::where('business_id', $businessId)
                                ->where('status', 'active')
                                ->where('amount', '>', 0)
                                ->orderByDesc('created_at')
                                ->first();
                        }
                        if ($gc && $gc->status === 'active') {
                            $deduct = (float) ($split['amount'] ?? $split['inputAmount'] ?? 0);
                            if ($deduct > 0) {
                                $gc->amount = max(0.0, (float) $gc->amount - $deduct);
                                if ($gc->amount <= 0.001) {
                                    $gc->amount = 0.0;
                                    $gc->status = 'redeemed';
                                    $gc->redeemed_at = now();
                                }
                                $gc->save();
                            }
                        }
                    }
                }
            }

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

            $hasTable = \Illuminate\Support\Facades\Schema::hasTable('service_products');
            if ($hasTable) {
                $service->loadMissing('linkedProducts');
            }
            $linkedProducts = $hasTable ? $service->linkedProducts : null;

            if ($linkedProducts && $linkedProducts->count() > 0) {
                $defaultLocation = $defaultLocation ?? $this->inventoryService->getDefaultLocation(
                    $businessId,
                    $appointment->branch_id,
                );

                foreach ($linkedProducts as $lp) {
                    $prod = \App\Models\Product::find($lp->product_id);
                    $prodName = $prod ? $prod->name : 'Producto Insumo';
                    $qty = max(0.01, (float) $lp->quantity);

                    $this->validateAndDeductStock(
                        $businessId,
                        $lp->product_id,
                        $lp->variant_id,
                        $qty,
                        $prodName,
                        $appointment->branch_id,
                        $defaultLocation,
                    );

                    $this->inventoryService->recordMovement(
                        businessId: $businessId,
                        locationId: $defaultLocation,
                        productId: $lp->product_id,
                        variantId: $lp->variant_id,
                        movementType: 'consumption',
                        quantity: -$qty,
                        unitCost: $prod ? (float) $prod->unit_cost : 0,
                        referenceType: 'appointment',
                        referenceId: $appointmentId,
                        notes: "Consumo automático ({$qty}x) por servicio: {$service->name}",
                        createdBy: $createdBy,
                        branchId: $appointment->branch_id,
                        exchangeRateUsed: $rate,
                        clientId: $appointment->client_id,
                    );
                }
            } else if ($service->linked_product_id) {
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

            $clientName = $appointment->client?->full_name
                ?? ($appointment->client?->name)
                ?? 'Cliente Desconocido';
            $this->addCreditToDailyReport(
                $businessId, $appointment->branch_id, $method,
                $paymentsBreakdown, $totalAmount, $rate,
                $clientName, $tx->id,
            );
            $this->createCreditRecord(
                $businessId, $appointment->branch_id, $method, $totalAmount,
                $appointment->client_id, $clientName, $appointment->client?->phone,
                $tx->id, $createdBy,
            );

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
        ?string $clientNameInput,
        ?string $clientPhoneInput,
        string $businessId,
        ?string $branchId,
        string $createdBy,
    ): string {
        if (empty($products)) {
            throw new RuntimeException('La venta directa requiere al menos un producto.');
        }

        $rate = $exchangeRate ?: 1;

        $clientName = $clientNameInput;
        if (!$clientName && $clientId) {
            $client = \App\Models\Client::where('business_id', $businessId)->find($clientId);
            $clientName = $client?->full_name;
        }

        if (!$clientId && !empty($clientNameInput) && !empty($clientPhoneInput)) {
            $client = \App\Models\Client::create([
                'id' => \Illuminate\Support\Str::uuid()->toString(),
                'business_id' => $businessId,
                'branch_id' => $branchId,
                'full_name' => $clientNameInput,
                'phone' => $clientPhoneInput,
            ]);
            $clientId = $client->id;
            $clientName = $client->full_name;
        }
        
        $clientInfoStr = $clientName ? ($clientPhoneInput ? "{$clientName} ({$clientPhoneInput})" : $clientName) : null;

        return DB::transaction(function () use (
            $totalAmount, $method, $products, $notes, $rate,
            $paymentsBreakdown, $clientId, $businessId, $branchId, $createdBy, $clientInfoStr, $clientName
        ) {
            $receiptCode = null;
            $business = \App\Models\Business::find($businessId);
            if ($business && in_array($business->niche_type, ['tienda', 'retail'])) {
                $lastCode = Transaction::where('business_id', $businessId)
                    ->whereNotNull('receipt_code')
                    ->lockForUpdate()
                    ->max('receipt_code');
                
                if ($lastCode) {
                    $num = (int) substr($lastCode, 1);
                    $receiptCode = 'B' . str_pad($num + 1, 4, '0', STR_PAD_LEFT);
                } else {
                    $receiptCode = 'B0001';
                }
            }

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
                'receipt_code' => $receiptCode,
                'created_by' => $createdBy,
                'notes' => $notes ?? ($clientInfoStr ? "Venta directa — {$clientInfoStr}" : 'Venta directa'),
                'tip_amount' => 0,
                'paid_at' => now(),
            ]);

            if (is_array($paymentsBreakdown)) {
                foreach ($paymentsBreakdown as $split) {
                    if (isset($split['method']) && $split['method'] === 'gift_card') {
                        $gcId = $split['gift_card_id'] ?? $split['giftCardId'] ?? null;
                        $gc = null;
                        if (!empty($gcId)) {
                            $gc = \App\Models\GiftCard::find($gcId);
                        }
                        if (!$gc && !empty($businessId)) {
                            $gc = \App\Models\GiftCard::where('business_id', $businessId)
                                ->where('status', 'active')
                                ->where('amount', '>', 0)
                                ->orderByDesc('created_at')
                                ->first();
                        }
                        if ($gc && $gc->status === 'active') {
                            $deduct = (float) ($split['amount'] ?? $split['inputAmount'] ?? 0);
                            if ($deduct > 0) {
                                $gc->amount = max(0.0, (float) $gc->amount - $deduct);
                                if ($gc->amount <= 0.001) {
                                    $gc->amount = 0.0;
                                    $gc->status = 'redeemed';
                                    $gc->redeemed_at = now();
                                }
                                $gc->save();
                            }
                        }
                    }
                }
            }

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

            $resolvedClientName = $clientName ?: ($clientInfoStr ? str_replace('Venta directa — ', '', $clientInfoStr) : 'Cliente Desconocido');
            $this->addCreditToDailyReport(
                $businessId, $branchId, $method,
                $paymentsBreakdown, $totalAmount, $rate,
                $resolvedClientName,
                $tx->id,
            );
            $this->createCreditRecord(
                $businessId, $branchId, $method, $totalAmount,
                $clientId, $resolvedClientName, null,
                $tx->id, $createdBy,
            );

            return $tx->id;
        });
    }

    /**
     * Process a direct service sale (without a pre-created appointment).
     * Automatically creates a completed appointment record and processes the sale atomically.
     */
    public function processDirectServiceSale(
        ?string $serviceId,
        ?string $employeeId,
        ?string $assistantEmployeeId,
        ?string $clientId,
        float $serviceAmount,
        string $method,
        array $products,
        ?string $notes,
        ?float $exchangeRate,
        array $paymentsBreakdown,
        ?float $tipAmount,
        string $businessId,
        ?string $branchId,
        string $createdBy,
        float $productsAmount = 0,
        array $services = [],
    ): string {
        if (empty($services) && $serviceId && $employeeId) {
            $services = [[
                'service_id' => $serviceId,
                'employee_id' => $employeeId,
                'assistant_employee_id' => $assistantEmployeeId,
                'price' => $serviceAmount,
            ]];
        }

        if (empty($services)) {
            throw new RuntimeException('Debe incluir al menos un servicio para realizar el cobro directo.');
        }

        $source = 'pos_direct';
        try {
            DB::statement("ALTER TYPE appointment_source ADD VALUE IF NOT EXISTS 'pos_direct'");
        } catch (\Throwable $e) {
            $source = 'internal';
        }

        try {
            DB::statement('ALTER TABLE appointments ALTER COLUMN client_id DROP NOT NULL;');
        } catch (\Throwable $e) {
            // Ignore if column already nullable or sqlite
        }

        if (!$clientId) {
            $generalClient = \App\Models\Client::firstOrCreate(
                [
                    'business_id' => $businessId,
                    'full_name' => 'Cliente General',
                ],
                [
                    'phone' => '0000000000',
                    'notes' => 'Cliente genérico para ventas directas sin cliente asignado',
                ]
            );
            $clientId = $generalClient->id;
        }

        return DB::transaction(function () use (
            $services, $clientId, $serviceAmount, $method, $products, $notes,
            $exchangeRate, $paymentsBreakdown, $tipAmount, $businessId, $branchId,
            $createdBy, $productsAmount, $source
        ) {
            $groupId = count($services) > 1 ? Str::uuid()->toString() : null;
            $createdAppointments = [];
            $totalServicesAmount = 0;

            foreach ($services as $svcItem) {
                $svc = \App\Models\Service::where('business_id', $businessId)->find($svcItem['service_id']);
                $duration = (int) ($svc?->duration_minutes ?? 30);
                if ($duration < 1) $duration = 30;

                $startTime = now();
                $endTime = (clone $startTime)->addMinutes($duration);
                $svcPrice = isset($svcItem['price']) ? (float) $svcItem['price'] : (float) ($svc?->price ?? 0);
                $totalServicesAmount += $svcPrice;

                $appointment = Appointment::create([
                    'id' => Str::uuid()->toString(),
                    'business_id' => $businessId,
                    'branch_id' => $branchId,
                    'client_id' => $clientId,
                    'employee_id' => $svcItem['employee_id'],
                    'assistant_employee_id' => $svcItem['assistant_employee_id'] ?? null,
                    'service_id' => $svcItem['service_id'],
                    'start_time' => $startTime,
                    'end_time' => $endTime,
                    'status' => 'completed',
                    'payment_status' => 'unpaid',
                    'price_override' => $svcPrice,
                    'group_id' => $groupId,
                    'service_notes' => $notes,
                    'internal_notes' => 'Cobro directo en POS',
                    'source' => $source,
                    'created_by' => $createdBy,
                ]);

                $createdAppointments[] = [
                    'appointment' => $appointment,
                    'price' => $svcPrice,
                ];
            }

            if (count($createdAppointments) === 1) {
                $item = $createdAppointments[0];
                return $this->processSale(
                    appointmentId: $item['appointment']->id,
                    serviceAmount: $item['price'],
                    method: $method,
                    products: $products,
                    notes: $notes,
                    exchangeRate: $exchangeRate,
                    paymentsBreakdown: $paymentsBreakdown,
                    tipAmount: $tipAmount,
                    businessId: $businessId,
                    createdBy: $createdBy,
                    productsAmount: $productsAmount,
                );
            }

            $lastTxId = null;
            $tipsPerAppt = count($createdAppointments) > 0 && $tipAmount ? round($tipAmount / count($createdAppointments), 2) : 0;

            foreach ($createdAppointments as $index => $item) {
                $isFirst = ($index === 0);
                $appt = $item['appointment'];
                $price = $item['price'];

                $proportion = $totalServicesAmount > 0 ? ($price / $totalServicesAmount) : (1 / count($createdAppointments));
                
                $itemBreakdown = [];
                if (is_array($paymentsBreakdown)) {
                    foreach ($paymentsBreakdown as $bItem) {
                        $inputAmt = isset($bItem['inputAmount']) ? (float) $bItem['inputAmount'] : (float) ($bItem['amount'] ?? 0);
                        $amt = isset($bItem['amount']) ? (float) $bItem['amount'] : 0;
                        $itemBreakdown[] = array_merge($bItem, [
                            'inputAmount' => round($inputAmt * $proportion, 2),
                            'amount' => round($amt * $proportion, 2),
                        ]);
                    }
                }

                $lastTxId = $this->processSale(
                    appointmentId: $appt->id,
                    serviceAmount: $price,
                    method: $method,
                    products: $isFirst ? $products : [],
                    notes: $notes,
                    exchangeRate: $exchangeRate,
                    paymentsBreakdown: $itemBreakdown,
                    tipAmount: $tipsPerAppt,
                    businessId: $businessId,
                    createdBy: $createdBy,
                    productsAmount: $isFirst ? $productsAmount : 0,
                );
            }

            return $lastTxId;
        });
    }

    private function validateAndDeductStock(
        string $businessId,
        string $productId,
        ?string $variantId,
        float|int $quantity,
        string $productName,
        ?string $branchId,
        string $defaultLocation,
    ): void {
        $stockQuery = \App\Models\InventoryStock::where('business_id', $businessId)
            ->where('product_id', $productId)
            ->when($variantId, fn($q) => $q->where('variant_id', $variantId), fn($q) => $q->whereNull('variant_id'));

        if ($branchId) {
            $stockQuery->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        $stock = (clone $stockQuery)->where('location_id', $defaultLocation)->lockForUpdate()->first()
            ?? $stockQuery->lockForUpdate()->first();

        if (!$stock || $stock->quantity < $quantity) {
            $avail = $stock ? $stock->quantity : 0;
            throw new RuntimeException("Stock insuficiente para {$productName}. Disponible: {$avail}");
        }

        $stock->quantity -= $quantity;
        $stock->save();
    }

    /**
     * Auto-add a credit sale to the daily_reports table so it appears
     * automatically in the daily report without manual entry.
     */
    private function addCreditToDailyReport(
        string $businessId,
        ?string $branchId,
        string $method,
        array $paymentsBreakdown,
        float $totalAmount,
        float $exchangeRate,
        string $clientName,
        string $transactionId,
    ): void {
        $creditAmount = 0;
        $creditCurrency = 'USD';

        if ($method === 'credito') {
            $creditAmount = $totalAmount;
        } elseif ($method === 'mixed' && !empty($paymentsBreakdown)) {
            foreach ($paymentsBreakdown as $split) {
                if (($split['method'] ?? '') === 'credito') {
                    $creditAmount += (float) ($split['amount'] ?? $split['inputAmount'] ?? 0);
                    $creditCurrency = ($split['currency'] ?? 'USD') === 'VES' ? 'VES' : 'USD';
                }
            }
        }

        if ($creditAmount <= 0) return;

        $today = Carbon::now()->toDateString();

        $report = DailyReport::firstOrNew([
            'business_id' => $businessId,
            'branch_id' => $branchId,
            'date' => $today,
        ]);

        if (!$report->exists) {
            $report->user_id = null;
            $report->fill(array_fill_keys([
                'exchange_rate', 'z_report_bs', 'z_report_usd',
                'pos_bs', 'pago_movil_bs', 'cash_bs', 'transfer_bs',
                'cash_usd', 'zelle_usd', 'binance_usd', 'cashea_usd',
                'card_usd', 'gift_card_usd', 'other_usd', 'other_bs',
                'credit_bs', 'credit_usd', 'total_bs', 'total_usd',
            ], 0));
        }

        $creditsDetail = $report->credits_detail ?? [];

        $creditsDetail[] = [
            'name' => $clientName,
            'amount' => $creditAmount,
            'currency' => $creditCurrency === 'VES' ? 'Bs' : 'USD',
            'transaction_id' => $transactionId,
        ];

        if ($creditCurrency === 'VES') {
            $report->credit_bs = (float) ($report->credit_bs ?? 0) + $creditAmount;
            $report->total_bs = (float) ($report->total_bs ?? 0) + $creditAmount;
        } else {
            $report->credit_usd = (float) ($report->credit_usd ?? 0) + $creditAmount;
            $report->total_usd = (float) ($report->total_usd ?? 0) + $creditAmount;
        }

        $report->credits_detail = $creditsDetail;
        $report->save();
    }

    /**
     * Create a trackable Credit record for a full-credito sale so it shows up
     * in the "Créditos" section and can later be marked as paid.
     * Mixed-method sales that include a credito split are not tracked here —
     * only pure `credito` transactions are.
     */
    private function createCreditRecord(
        string $businessId,
        ?string $branchId,
        string $method,
        float $totalAmount,
        ?string $clientId,
        string $clientName,
        ?string $clientPhone,
        string $transactionId,
        string $createdBy,
    ): void {
        if ($method !== 'credito' || $totalAmount <= 0) {
            return;
        }

        Credit::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'branch_id' => $branchId,
            'client_id' => $clientId,
            'client_name' => $clientName,
            'client_phone' => $clientPhone,
            'transaction_id' => $transactionId,
            'amount' => $totalAmount,
            'currency' => 'USD',
            'status' => 'pending',
            'created_by' => $createdBy,
        ]);
    }
}
