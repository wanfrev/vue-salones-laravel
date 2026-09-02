<?php

namespace App\Services;

use App\Models\EmployeePayment;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\Profile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class EmployeePaymentService
{
    public function __construct(
        private ?InventoryService $inventoryService = null,
    ) {
        $this->inventoryService = $inventoryService ?? app(InventoryService::class);
    }

    public function list(
        string $businessId,
        ?string $branchId = null,
        ?string $startDate = null,
        ?string $endDate = null,
        ?string $employeeId = null,
    ): Collection {
        $query = EmployeePayment::with(['employeeProfile', 'product'])
            ->where('business_id', $businessId)
            ->orderByDesc('payment_date');

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }
        if ($employeeId) {
            $query->where('employee_id', $employeeId);
        }
        if ($startDate) {
            $query->whereDate('payment_date', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('payment_date', '<=', $endDate);
        }

        return $query->get();
    }

    public function store(array $data, string $businessId, string $createdBy): EmployeePayment
    {
        return DB::transaction(function () use ($data, $businessId, $createdBy) {
            $payload = [
                'id' => Str::uuid()->toString(),
                'business_id' => $businessId,
                'branch_id' => $data['branch_id'] ?? null,
                'employee_id' => $data['employee_id'],
                'amount' => $data['amount'],
                'currency' => $data['currency'] ?? 'USD',
                'original_amount' => $data['original_amount'] ?? 0,
                'exchange_rate_used' => $data['exchange_rate_used'] ?? 1,
                'payment_method' => $data['payment_method'] ?? 'transfer',
                'type' => $data['type'] ?? 'payment',
                'concept' => $data['concept'] ?? null,
                'notes' => $data['notes'] ?? null,
                'payment_date' => $data['payment_date'] ?? now()->toDateString(),
                'created_by' => $createdBy,
            ];

            $productId = $data['product_id'] ?? null;
            $quantity = !empty($data['quantity']) ? abs((float) $data['quantity']) : 1.0;

            if ($productId && Schema::hasColumn('employee_payments', 'product_id')) {
                $payload['product_id'] = $productId;
                $payload['quantity'] = $quantity;
            }

            $payment = EmployeePayment::create($payload);

            if ($productId && ($data['type'] ?? '') === 'consumption') {
                $product = Product::where('id', $productId)
                    ->where('business_id', $businessId)
                    ->first();

                if ($product) {
                    $employeeProfile = Profile::find($data['employee_id']);
                    $employeeName = $employeeProfile ? ($employeeProfile->first_name . ' ' . $employeeProfile->last_name) : 'Empleado';
                    $conceptNote = $data['concept'] ? ": {$data['concept']}" : ": {$product->name}";

                    $this->inventoryService->adjust([
                        'product_id' => $product->id,
                        'quantity' => -$quantity,
                        'branch_id' => $data['branch_id'] ?? null,
                        'movement_type' => 'consumption',
                        'reference_type' => 'employee_payment',
                        'reference_id' => $payment->id,
                        'notes' => "Consumo de {$employeeName}{$conceptNote}",
                    ], $businessId, $createdBy);
                }
            }

            return $payment->fresh(['employeeProfile', 'product']);
        });
    }

    public function update(string $id, array $data, string $businessId): EmployeePayment
    {
        $payment = $this->findForBusiness($id, $businessId);
        $payment->update($data);
        return $payment->fresh(['employeeProfile', 'product']);
    }

    public function destroy(string $id, string $businessId, ?string $userId = null): void
    {
        DB::transaction(function () use ($id, $businessId, $userId) {
            $payment = $this->findForBusiness($id, $businessId);

            // Revert inventory movement if this consumption had reduced stock
            $movements = InventoryMovement::where('reference_type', 'employee_payment')
                ->where('reference_id', $payment->id)
                ->where('business_id', $businessId)
                ->get();

            foreach ($movements as $movement) {
                $this->inventoryService->adjust([
                    'product_id' => $movement->product_id,
                    'variant_id' => $movement->variant_id,
                    'quantity' => abs($movement->quantity),
                    'branch_id' => $movement->branch_id,
                    'movement_type' => 'adjustment',
                    'reference_type' => 'employee_payment_void',
                    'reference_id' => $payment->id,
                    'notes' => "Reversión de consumo de empleado eliminado (#{$payment->id})",
                ], $businessId, $userId ?? $payment->created_by);
            }

            $payment->delete();
        });
    }

    private function findForBusiness(string $id, string $businessId): EmployeePayment
    {
        $payment = EmployeePayment::find($id);
        if (!$payment || $payment->business_id !== $businessId) {
            throw new NotFoundHttpException('Pago no encontrado.');
        }
        return $payment;
    }
}
