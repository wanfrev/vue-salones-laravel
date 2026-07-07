<?php

namespace App\Policies;

class NotificationPolicy
{
    use OwnsBusinessResource;

    public function view(User $user, $notification, $context): bool
    {
        return $notification->profile_id === $context->profileId
            || $notification->business_id === $context->businessId;
    }

    public function create(User $user, $context): bool
    {
        return $context->isStaff();
    }
}
