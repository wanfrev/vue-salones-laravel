<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Product;
use App\Models\Transaction;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use RuntimeException;

class PosService
{
    public function __construct(
        private AppointmentService $appointmentService,
        private InventoryService $inventoryService,
    ) {}

    public function pendingAppointments(string $businessId, ?string $branchId = null): Collection
    {
        return $this->appointmentService->getPendingPayments($businessId, $branchId);
    }

    public function saleableProducts(string $businessId, ?string $branchId = null): Collection
    {
        $query = Product::with('category')
            ->where('business_id', $businessId)
            ->where('active', true)
            ->where('is_sellable', true)
            ->orderBy('name');

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        return $query->get();
    }

    public function recordPayment(
        string $appointmentId,
        float $amount,
        string $method = 'cash',
        ?string $notes = null,
        ?float $exchangeRate = null,
        array $paymentsBreakdown = [],
        string $businessId = '',
        string $createdBy = '',
    ): string {
        $appointment = Appointment::with(['service', 'employeeProfile'])->find($appointmentId);
        if (!$appointment) throw new RuntimeException('Cita no encontrada.');

        $service = $appointment->service;
        $employeeProfile = $appointment->employeeProfile;
        $effectivePrice = $appointment->price_override ?? $service->price ?? $amount;

        $assistantPct = $appointment->assistant_percentage ?? 0;

        $employeePct = $appointment->employee_percentage_override
            ?? $employeeProfile?->pay_percentage
            ?? (100 - ($service->local_percentage ?? 50));

        $localPct = 100 - $employeePct - $assistantPct;

        $assistantAmount = round($amount * $assistantPct / 100, 2);
        $employeeAmount = round($amount * $employeePct / 100, 2);
        $localAmount = round($amount - $employeeAmount - $assistantAmount, 2);

        $rate = $exchangeRate ?? 1;

        $tx = Transaction::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $appointment->business_id,
            'branch_id' => $appointment->branch_id,
            'appointment_id' => $appointmentId,
            'total_amount' => $amount,
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
            'paid_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $paidSoFar = Transaction::where('appointment_id', $appointmentId)->sum('total_amount');
        $paymentStatus = match (true) {
            $paidSoFar >= $effectivePrice => 'paid',
            $paidSoFar > 0 => 'partial',
            default => 'unpaid',
        };

        $appointment->update(['payment_status' => $paymentStatus]);

        return $tx->id;
    }

    public function recordSale(
        string $appointmentId,
        float $amount,
        string $method = 'cash',
        array $products = [],
        ?string $notes = null,
        ?float $exchangeRate = null,
        array $paymentsBreakdown = [],
        string $businessId = '',
        string $createdBy = '',
    ): string {
        $txId = $this->recordPayment(
            appointmentId: $appointmentId,
            amount: $amount,
            method: $method,
            notes: $notes,
            exchangeRate: $exchangeRate,
            paymentsBreakdown: $paymentsBreakdown,
            businessId: $businessId,
            createdBy: $createdBy,
        );

        if (!empty($products)) {
            $appointment = Appointment::find($appointmentId);
            $defaultLocation = $this->inventoryService->getDefaultLocation(
                $appointment->business_id,
                $appointment->branch_id,
            );

            foreach ($products as $product) {
                $stock = $this->inventoryService->getStockRecord(
                    businessId: $appointment->business_id,
                    productId: $product['product_id'],
                    locationId: $product['location_id'] ?? $defaultLocation,
                    variantId: $product['variant_id'] ?? null,
                    branchId: $appointment->branch_id,
                );

                if (!$stock || $stock->quantity < ($product['quantity'] ?? 1)) {
                    throw new RuntimeException('Stock insuficiente para ' . ($product['name'] ?? $product['product_id']));
                }

                $qty = $product['quantity'] ?? 1;
                $this->inventoryService->updateStockQuantity($stock->id, $stock->quantity - $qty);

                $this->inventoryService->recordMovement(
                    businessId: $appointment->business_id,
                    locationId: $product['location_id'] ?? $defaultLocation,
                    productId: $product['product_id'],
                    variantId: $product['variant_id'] ?? null,
                    movementType: 'sale',
                    quantity: -$qty,
                    unitCost: $product['unit_cost'] ?? 0,
                    referenceType: 'appointment',
                    referenceId: $appointmentId,
                    notes: 'Venta punto de venta',
                    createdBy: $createdBy,
                    branchId: $appointment->branch_id,
                );
            }
        }

        return $txId;
    }

    public function markAppointmentsAsPaid(array $appointmentIds, string $businessId): void
    {
        Appointment::whereIn('id', $appointmentIds)
            ->where('business_id', $businessId)
            ->update(['payment_status' => 'paid', 'updated_at' => now()]);
    }

    public function updateTransaction(
        string $transactionId,
        float $amount,
        string $method = 'cash',
        ?string $notes = null,
        ?float $exchangeRate = null,
        string $businessId = '',
    ): Transaction {
        $tx = Transaction::find($transactionId);
        if (!$tx) throw new RuntimeException('Transacción no encontrada.');

        $assistantAmount = round($amount * ($tx->assistant_percentage ?? 0) / 100, 2);
        $employeeAmount = round($amount * ($tx->employee_percentage ?? 0) / 100, 2);
        $localAmount = round($amount - $employeeAmount - $assistantAmount, 2);

        $tx->update([
            'total_amount' => $amount,
            'local_amount' => $localAmount,
            'employee_amount' => $employeeAmount,
            'assistant_amount' => $assistantAmount,
            'method' => $method,
            'notes' => $notes,
            'exchange_rate_used' => $exchangeRate ?? $tx->exchange_rate_used,
            'updated_at' => now(),
        ]);

        return $tx->fresh();
    }

    public function deleteTransaction(string $transactionId, string $businessId): void
    {
        $tx = Transaction::find($transactionId);
        if (!$tx) throw new RuntimeException('Transacción no encontrada.');

        $appointmentId = $tx->appointment_id;
        $tx->delete();

        $appointment = Appointment::find($appointmentId);
        if ($appointment) {
            $paidSoFar = Transaction::where('appointment_id', $appointmentId)->sum('total_amount');
            $service = $appointment->service;
            $effectivePrice = $appointment->price_override ?? $service?->price ?? 0;

            $paymentStatus = match (true) {
                $paidSoFar >= $effectivePrice => 'paid',
                $paidSoFar > 0 => 'partial',
                default => 'unpaid',
            };

            $appointment->update(['payment_status' => $paymentStatus]);
        }
    }
}
