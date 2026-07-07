<?php

namespace App\Policies;

use App\Models\Service;
use App\Models\User;
use App\Services\BusinessContext;

class ServicePolicy
{
    public function before(?User $user): ?bool
    {
        if ($user?->profile?->role === 'superadmin') return true;
        return null;
    }

    public function viewAny(User $user, BusinessContext $context): bool
    {
        return $context->isStaff();
    }

    public function view(User $user, Service $service, BusinessContext $context): bool
    {
        return $service->business_id === $context->businessId;
    }

    public function create(User $user, BusinessContext $context): bool
    {
        return $context->isAdmin();
    }

    public function update(User $user, Service $service, BusinessContext $context): bool
    {
        return $context->isAdmin()
            && $service->business_id === $context->businessId;
    }

    public function delete(User $user, Service $service, BusinessContext $context): bool
    {
        return $context->isAdmin()
            && $service->business_id === $context->businessId;
    }
}
