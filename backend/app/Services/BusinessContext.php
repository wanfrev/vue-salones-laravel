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
