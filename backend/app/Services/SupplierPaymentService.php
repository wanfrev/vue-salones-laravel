<?php

namespace App\Services;

use App\Models\Supplier;
use App\Models\SupplierPayment;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class SupplierPaymentService
{
    public function list(string $businessId, ?string $supplierId = null): Collection
    {
        $query = SupplierPayment::with('supplier')
            ->where('business_id', $businessId)
            ->orderByDesc('payment_date');

        if ($supplierId) $query->where('supplier_id', $supplierId);

        return $query->get();
    }

    public function store(array $data, string $businessId, string $createdBy): SupplierPayment
    {
        $payment = SupplierPayment::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'branch_id' => $data['branch_id'] ?? null,
            'supplier_id' => $data['supplier_id'],
            'amount' => $data['amount'],
            'payment_method' => $data['payment_method'] ?? 'cash',
            'payment_date' => $data['payment_date'] ?? now()->toDateString(),
            'notes' => $data['notes'] ?? null,
            'created_by' => $createdBy,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $payment;
    }

    public function destroy(string $id, string $businessId): void
    {
        $payment = SupplierPayment::find($id);
        if (!$payment || $payment->business_id !== $businessId) {
            throw new NotFoundHttpException('Pago no encontrado.');
        }
        $payment->delete();
    }
}
