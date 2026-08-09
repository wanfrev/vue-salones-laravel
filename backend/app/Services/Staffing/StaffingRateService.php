<?php

namespace App\Services\Staffing;

use App\Models\StaffingCompanyRate;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class StaffingRateService
{
    public function __construct(private StaffingCompanyService $companies) {}

    public function list(string $businessId, ?string $companyId = null): Collection
    {
        $query = StaffingCompanyRate::query()
            ->where('business_id', $businessId)
            ->orderBy('role');

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        return $query->get();
    }

    /**
     * Upsert by (company, role) rather than insert. The unique index makes a second POST for the
     * same role a constraint violation, and "save the rate card" from the UI naturally re-sends
     * roles that already exist.
     */
    public function store(array $data, string $businessId): StaffingCompanyRate
    {
        // Ownership check: refuses to attach a rate to another tenant's company.
        $this->companies->findForBusiness($data['company_id'], $businessId);

        $existing = StaffingCompanyRate::where('business_id', $businessId)
            ->where('company_id', $data['company_id'])
            ->where('role', $data['role'])
            ->first();

        if ($existing) {
            $existing->update([
                'pay_rate' => $data['pay_rate'],
                'bill_rate' => $data['bill_rate'],
                'active' => $data['active'] ?? true,
                'updated_at' => now(),
            ]);

            return $existing->fresh();
        }

        return StaffingCompanyRate::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'company_id' => $data['company_id'],
            'role' => $data['role'],
            'pay_rate' => $data['pay_rate'],
            'bill_rate' => $data['bill_rate'],
            'active' => $data['active'] ?? true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function update(string $id, array $data, string $businessId): StaffingCompanyRate
    {
        $rate = $this->findForBusiness($id, $businessId);
        $rate->update($data + ['updated_at' => now()]);

        return $rate->fresh();
    }

    public function destroy(string $id, string $businessId): void
    {
        $this->findForBusiness($id, $businessId)->delete();
    }

    /**
     * The rate an employee earns and bills at, from their company + role. Returns null when the
     * role has no entry — callers must treat that as "cannot compute payroll for this person"
     * rather than defaulting to zero, which would silently pay someone nothing.
     */
    public function resolveFor(string $businessId, ?string $companyId, ?string $role): ?StaffingCompanyRate
    {
        if (!$companyId || !$role) {
            return null;
        }

        return StaffingCompanyRate::where('business_id', $businessId)
            ->where('company_id', $companyId)
            ->where('role', $role)
            ->where('active', true)
            ->first();
    }

    public function findForBusiness(string $id, string $businessId): StaffingCompanyRate
    {
        $rate = StaffingCompanyRate::find($id);
        if (!$rate || $rate->business_id !== $businessId) {
            throw new NotFoundHttpException('Tarifa no encontrada.');
        }

        return $rate;
    }
}
