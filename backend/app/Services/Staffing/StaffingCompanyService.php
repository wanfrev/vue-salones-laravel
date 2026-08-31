<?php

namespace App\Services\Staffing;

use App\Models\StaffingCompany;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Mirrors SupplierService's shape. Tenancy is filtered by hand in every query on purpose — the
 * BelongsToBusiness/BelongsToBranch global scopes are commented out repo-wide, so the trait on
 * the model is documentation, not enforcement.
 */
class StaffingCompanyService
{
    public function list(
        string $businessId,
        ?string $branchId = null,
        ?bool $active = null,
        ?string $status = null,
    ): Collection {
        $query = StaffingCompany::query()
            ->where('business_id', $businessId)
            ->orderBy('name');

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        // `status` is the tri-state filter (active|inactive|on_hold); `active` is the legacy
        // boolean still used by call sites that only care about "active or not".
        if ($status !== null) {
            $query->where('status', $status);
        } elseif ($active !== null) {
            $query->where('active', $active);
        }

        return $query->get();
    }

    public function store(array $data, string $businessId): StaffingCompany
    {
        return StaffingCompany::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'branch_id' => $data['branch_id'] ?? null,
            'name' => $data['name'],
            'legal_name' => $data['legal_name'] ?? null,
            'address' => $data['address'] ?? null,
            'city' => $data['city'] ?? null,
            'state' => $data['state'] ?? null,
            'zip' => $data['zip'] ?? null,
            'work_site' => $data['work_site'] ?? null,
            'contact_name' => $data['contact_name'] ?? null,
            'contact_phone' => $data['contact_phone'] ?? null,
            'contact_email' => $data['contact_email'] ?? null,
            'payment_terms_days' => $data['payment_terms_days'] ?? 15,
            'agency_overhead_rate' => $data['agency_overhead_rate'] ?? 0.04,
            // Tiered brackets are legacy (a company created through the current UI only ever
            // sets tax_rate below) — no longer defaulted to DYKE's agreement for new companies,
            // see StaffingTermsFactory::taxRuleFor().
            'tax_brackets' => $data['tax_brackets'] ?? null,
            'tax_destination' => $data['tax_destination'] ?? TaxRule::REMITTED,
            'tax_rate' => $data['tax_rate'] ?? 0.04,
            'payout_rounding' => $data['payout_rounding'] ?? PayrollTerms::PAYOUT_CENT,
            'active' => $data['active'] ?? true,
            'status' => $data['status'] ?? StaffingCompany::STATUS_ACTIVE,
            'notes' => $data['notes'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function update(string $id, array $data, string $businessId): StaffingCompany
    {
        $company = $this->findForBusiness($id, $businessId);
        $company->update($data + ['updated_at' => now()]);

        return $company->fresh();
    }

    /**
     * Permanently deletes a staffing company.
     */
    public function destroy(string $id, string $businessId): void
    {
        $company = $this->findForBusiness($id, $businessId);
        $company->delete();
    }

    public function findForBusiness(string $id, string $businessId): StaffingCompany
    {
        $company = StaffingCompany::find($id);
        if (!$company || $company->business_id !== $businessId) {
            throw new NotFoundHttpException('Empresa no encontrada.');
        }

        return $company;
    }
}
