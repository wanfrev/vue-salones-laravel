<?php

namespace App\Policies;

use App\Models\Transaction;
use App\Models\User;

class TransactionPolicy
{
    use OwnsBusinessResource;

    public function view(User $user, Transaction $transaction, $context): bool
    {
        return $transaction->business_id === $context->businessId;
    }
}
