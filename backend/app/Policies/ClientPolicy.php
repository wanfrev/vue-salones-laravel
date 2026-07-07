<?php

namespace App\Policies;

use App\Models\Client;
use App\Models\User;
use App\Services\BusinessContext;

class ClientPolicy
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

    public function view(User $user, Client $client, BusinessContext $context): bool
    {
        return $client->business_id === $context->businessId;
    }

    public function create(User $user, BusinessContext $context): bool
    {
        return $context->isStaff();
    }

    public function update(User $user, Client $client, BusinessContext $context): bool
    {
        return $client->business_id === $context->businessId;
    }

    public function delete(User $user, Client $client, BusinessContext $context): bool
    {
        return $context->isAdmin()
            && $client->business_id === $context->businessId;
    }
}
