<?php

namespace App\Policies;

use App\Models\User;
use App\Services\BusinessContext;

trait OwnsBusinessResource
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

    public function view(User $user, $model, BusinessContext $context): bool
    {
        return $model->business_id === $context->businessId;
    }

    public function create(User $user, BusinessContext $context): bool
    {
        return $context->isAdmin();
    }

    public function update(User $user, $model, BusinessContext $context): bool
    {
        return $context->isAdmin() && $model->business_id === $context->businessId;
    }

    public function delete(User $user, $model, BusinessContext $context): bool
    {
        return $context->isAdmin() && $model->business_id === $context->businessId;
    }
}
