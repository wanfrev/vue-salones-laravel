<?php

namespace App\Services;

use App\Models\EmployeePayment;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class EmployeePaymentService
{
    public function list(
        string $businessId,
        ?string $branchId = null,
        ?string $startDate = null,
        ?string $endDate = null,
        ?string $employeeId = null,
    ): Collection {
        $query = EmployeePayment::with('employeeProfile')
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
        return EmployeePayment::create([
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
        ]);
    }

    public function update(string $id, array $data, string $businessId): EmployeePayment
    {
        $payment = $this->findForBusiness($id, $businessId);
        $payment->update($data);
        return $payment->fresh();
    }

    public function destroy(string $id, string $businessId): void
    {
        $payment = $this->findForBusiness($id, $businessId);
        $payment->delete();
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
