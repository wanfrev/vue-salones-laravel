<?php

namespace App\Policies;

use App\Models\Appointment;
use App\Models\User;
use App\Services\BusinessContext;

class AppointmentPolicy
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

    public function view(User $user, Appointment $appointment, BusinessContext $context): bool
    {
        return $appointment->business_id === $context->businessId
            || $appointment->employee_id === $context->profileId;
    }

    public function create(User $user, BusinessContext $context): bool
    {
        return $context->isStaff();
    }

    public function update(User $user, Appointment $appointment, BusinessContext $context): bool
    {
        return $appointment->business_id === $context->businessId;
    }

    public function delete(User $user, Appointment $appointment, BusinessContext $context): bool
    {
        return $context->isAdmin()
            && $appointment->business_id === $context->businessId;
    }

    public function updateStatus(User $user, Appointment $appointment, BusinessContext $context): bool
    {
        return $appointment->business_id === $context->businessId
            || $appointment->employee_id === $context->profileId;
    }

    public function updateTime(User $user, Appointment $appointment, BusinessContext $context): bool
    {
        return $appointment->business_id === $context->businessId;
    }
}
