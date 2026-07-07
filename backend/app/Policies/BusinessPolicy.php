<?php

namespace App\Policies;

class BusinessPolicy
{
    use OwnsBusinessResource;

    public function view(User $user, $business, $context): bool
    {
        return $business->id === $context->businessId;
    }

    public function update(User $user, $business, $context): bool
    {
        return $context->isAdmin() && $business->id === $context->businessId;
    }

    public function create(User $user, $context): bool
    {
        return false;
    }

    public function delete(User $user, $business, $context): bool
    {
        return false;
    }
}
