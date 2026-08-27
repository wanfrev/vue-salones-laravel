<?php

namespace App\Services;

use App\Support\NicheRegistry;

class BusinessContext
{
    /** @var array<string, bool> */
    private array $features;

    public function __construct(
        public readonly string $businessId,
        public readonly ?string $branchId = null,
        public readonly ?string $profileId = null,
        public readonly string $role = 'admin',
        public readonly ?string $nicheType = null,
        ?array $rawFeatures = null,
        public readonly bool $canAccessInventory = false,
        public readonly bool $canAccessPos = false,
        public readonly bool $canAccessSuppliers = false,
        public readonly bool $canAccessRequirements = false,
        public readonly bool $disableInventoryEdit = false,
        public readonly bool $canAddPurchaseInvoice = false,
        public readonly bool $canCreateAppointments = true,
    ) {
        $this->features = NicheRegistry::resolveFeatures($this->nicheType, $rawFeatures);
    }

    public function isSuperadmin(): bool
    {
        return $this->role === 'superadmin';
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin' || $this->role === 'encargado';
    }

    public function isEmployee(): bool
    {
        return $this->role === 'empleado';
    }

    public function isStaff(): bool
    {
        return !$this->isSuperadmin();
    }

    public function hasFeature(string $key): bool
    {
        return (bool) ($this->features[$key] ?? false);
    }

    public function hasCapability(string $capability): bool
    {
        return NicheRegistry::hasCapability($this->nicheType, $capability);
    }

    /**
     * "Puede agendar citas" off means a plain empleado can only look — not touch anything on an
     * appointment (status, time, service, notes) and not delete it. Admin-panel roles are always
     * unrestricted. Deliberately its own always-enforcing check rather than a `perm:` middleware
     * key: `perm:`/`hasProfilePermission()` are report-only until config('niches.enforce') is
     * flipped (see EnsureProfilePermission), which would make this toggle silently do nothing —
     * wrong for a control the business is explicitly relying on today, not a niche rollout.
     */
    public function canEditAppointments(): bool
    {
        return $this->isAdmin() || $this->isSuperadmin() || $this->canCreateAppointments;
    }

    /**
     * Per-employee module access (tienda niche: inventory/pos/suppliers). Admin-panel roles
     * (admin/encargado/superadmin) are unrestricted — this only narrows what a plain
     * 'empleado'/'cajero' profile can reach, mirroring the frontend router guard.
     */
    public function hasProfilePermission(string $key): bool
    {
        if ($this->isAdmin() || $this->isSuperadmin()) {
            return true;
        }

        return match ($key) {
            'inventory' => $this->canAccessInventory,
            'inventory-edit' => $this->canAccessInventory && !$this->disableInventoryEdit,
            'pos' => $this->canAccessPos,
            'suppliers' => $this->canAccessSuppliers,
            'requirements' => $this->canAccessRequirements,
            'purchase-invoice' => $this->canAccessInventory && !$this->disableInventoryEdit && $this->canAddPurchaseInvoice,
            default => true,
        };
    }
}
