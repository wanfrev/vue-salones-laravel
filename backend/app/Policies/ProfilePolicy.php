<?php

namespace App\Policies;

use App\Models\Profile;
use App\Models\User;
use App\Services\BusinessContext;

class ProfilePolicy
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

    public function view(User $user, Profile $profile, BusinessContext $context): bool
    {
        return $profile->business_id === $context->businessId
            || $profile->id === $context->profileId;
    }

    public function create(User $user, BusinessContext $context): bool
    {
        return $context->isAdmin();
    }

    public function update(User $user, Profile $profile, BusinessContext $context): bool
    {
        if ($context->isAdmin() && $profile->business_id === $context->businessId) {
            return true;
        }
        if ($profile->id === $context->profileId) {
            return true;
        }
        return false;
    }

    public function delete(User $user, Profile $profile, BusinessContext $context): bool
    {
        return $context->isAdmin()
            && $profile->business_id === $context->businessId;
    }
}
