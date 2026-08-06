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
}
