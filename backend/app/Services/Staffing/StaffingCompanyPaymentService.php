<?php

namespace App\Services\Staffing;

use App\Models\StaffingCompanyPayment;
use App\Models\StaffingInvoice;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Abonos: what a client company has actually paid toward its balance. Mirrors SupplierPaymentService
 * — a payment optionally targets one invoice (`invoice_id`), otherwise it's a payment on account
 * against the company's running total (see StaffingInvoiceService::balanceForCompany).
 */
class StaffingCompanyPaymentService
{
    public function list(string $businessId, ?string $companyId = null): Collection
    {
        $query = StaffingCompanyPayment::where('business_id', $businessId)
            ->orderByDesc('payment_date');

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        return $query->get();
    }

    public function store(array $data, string $businessId, ?string $createdBy = null): StaffingCompanyPayment
    {
        $payment = StaffingCompanyPayment::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'company_id' => $data['company_id'],
            'invoice_id' => $data['invoice_id'] ?? null,
            'amount' => $data['amount'],
            'payment_method' => $data['payment_method'] ?? null,
            'payment_date' => $data['payment_date'],
            'reference' => $data['reference'] ?? null,
            'notes' => $data['notes'] ?? null,
            'created_by' => $createdBy,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if ($payment->invoice_id) {
            $this->syncInvoiceStatus($payment->invoice_id);
        }

        return $payment;
    }

    public function destroy(string $id, string $businessId): void
    {
        $payment = $this->findForBusiness($id, $businessId);
        $invoiceId = $payment->invoice_id;

        $payment->delete();

        if ($invoiceId) {
            $this->syncInvoiceStatus($invoiceId);
        }
    }

    /** Recomputes an invoice's status from what's actually been paid toward it — never hand-set. */
    private function syncInvoiceStatus(string $invoiceId): void
    {
        $invoice = StaffingInvoice::find($invoiceId);
        if (!$invoice) {
            return;
        }

        $paid = (float) StaffingCompanyPayment::where('invoice_id', $invoiceId)->sum('amount');

        $status = match (true) {
            $paid <= 0 => StaffingInvoice::STATUS_SENT,
            $paid >= $invoice->total => StaffingInvoice::STATUS_PAID,
            default => StaffingInvoice::STATUS_PARTIAL,
        };

        $invoice->update(['status' => $status, 'updated_at' => now()]);
    }

    public function findForBusiness(string $id, string $businessId): StaffingCompanyPayment
    {
        $payment = StaffingCompanyPayment::find($id);
        if (!$payment || $payment->business_id !== $businessId) {
            throw new NotFoundHttpException('Abono no encontrado.');
        }

        return $payment;
    }
}
