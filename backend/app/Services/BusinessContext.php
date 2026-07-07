<?php

namespace App\Services;

class BusinessContext
{
    public function __construct(
        public readonly string $businessId,
        public readonly ?string $branchId = null,
        public readonly ?string $profileId = null,
        public readonly string $role = 'admin',
    ) {}

    public function isSuperadmin(): bool
    {
        return $this->role === 'superadmin';
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isEmployee(): bool
    {
        return $this->role === 'empleado';
    }

    public function isStaff(): bool
    {
        return !$this->isSuperadmin();
    }
}
