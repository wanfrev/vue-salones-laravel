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
     * Upsert by (company, role, shift) rather than insert. The unique index makes a second POST
     * for the same role+shift a constraint violation, and "save the rate card" from the UI
     * naturally re-sends roles that already exist. `shift` null means "this role isn't split by
     * shift" — most companies never set it, same as before shift existed.
     */
    public function store(array $data, string $businessId): StaffingCompanyRate
    {
        // Ownership check: refuses to attach a rate to another tenant's company.
        $this->companies->findForBusiness($data['company_id'], $businessId);

        $shift = $data['shift'] ?? null;

        $existing = StaffingCompanyRate::where('business_id', $businessId)
            ->where('company_id', $data['company_id'])
            ->where('role', $data['role'])
            ->where('shift', $shift)
            ->first();

        if ($existing) {
            $existing->update([
                'pay_rate' => $data['pay_rate'],
                'bill_rate' => $data['bill_rate'],
                'overtime_threshold_hours' => $data['overtime_threshold_hours'] ?? null,
                'overtime_multiplier' => $data['overtime_multiplier'] ?? null,
                'overtime_pay_rate' => $data['overtime_pay_rate'] ?? null,
                'overtime_bill_rate' => $data['overtime_bill_rate'] ?? null,
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
            'shift' => $shift,
            'pay_rate' => $data['pay_rate'],
            'bill_rate' => $data['bill_rate'],
            'overtime_threshold_hours' => $data['overtime_threshold_hours'] ?? null,
            'overtime_multiplier' => $data['overtime_multiplier'] ?? null,
            'overtime_pay_rate' => $data['overtime_pay_rate'] ?? null,
            'overtime_bill_rate' => $data['overtime_bill_rate'] ?? null,
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
     * The rate an employee earns and bills at, from their company + role (+ shift, when the
     * company splits that role's pay by shift). Returns null when there's no matching entry —
     * callers must treat that as "cannot compute payroll for this person" rather than defaulting
     * to zero, which would silently pay someone nothing.
     */
    public function resolveFor(string $businessId, ?string $companyId, ?string $role, ?string $shift = null): ?StaffingCompanyRate
    {
        if (!$companyId || !$role) {
            return null;
        }

        return StaffingCompanyRate::where('business_id', $businessId)
            ->where('company_id', $companyId)
            ->where('role', $role)
            ->where('shift', $shift)
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
