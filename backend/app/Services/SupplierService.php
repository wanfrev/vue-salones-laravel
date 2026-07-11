<?php

namespace App\Services;

use App\Models\Supplier;
use App\Models\SupplierPayment;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class SupplierService
{
    public function list(string $businessId, ?string $branchId = null, ?bool $active = null): Collection
    {
        $query = Supplier::query()
            ->where('business_id', $businessId)
            ->orderBy('first_name');

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        if ($active !== null) {
            $query->where('active', $active);
        }

        return $query->get();
    }

    public function store(array $data, string $businessId): Supplier
    {
        return Supplier::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'branch_id' => $data['branch_id'] ?? null,
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'] ?? '',
            'phone' => $data['phone'] ?? null,
            'company' => $data['company'] ?? null,
            'total_debt' => $data['total_debt'] ?? 0,
            'debt_currency' => $data['debt_currency'] ?? 'USD',
            'debt_original_amount' => $data['debt_original_amount'] ?? 0,
            'debt_exchange_rate' => $data['debt_exchange_rate'] ?? 1,
            'notes' => $data['notes'] ?? null,
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function update(string $id, array $data, string $businessId): Supplier
    {
        $supplier = $this->findForBusiness($id, $businessId);
        $supplier->update($data + ['updated_at' => now()]);
        return $supplier->fresh();
    }

    public function destroy(string $id, string $businessId): void
    {
        $supplier = $this->findForBusiness($id, $businessId);
        $supplier->delete();
    }

    public function getBalance(string $id, string $businessId): array
    {
        $supplier = $this->findForBusiness($id, $businessId);

        $payments = SupplierPayment::where('supplier_id', $id)
            ->where('business_id', $businessId)
            ->sum('amount');

        return [
            'supplier_id' => $supplier->id,
            'supplier_name' => $supplier->first_name . ' ' . $supplier->last_name,
            'total_debt' => (float) $supplier->total_debt,
            'total_paid' => (float) $payments,
            'pending' => (float) $supplier->total_debt - (float) $payments,
            'debt_currency' => $supplier->debt_currency,
        ];
    }

    public function findForBusiness(string $id, string $businessId): Supplier
    {
        $supplier = Supplier::find($id);
        if (!$supplier || $supplier->business_id !== $businessId) {
            throw new NotFoundHttpException('Proveedor no encontrado.');
        }
        return $supplier;
    }
}
