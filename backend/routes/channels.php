<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('business.{businessId}', function ($user, $businessId) {
    $profile = $user->profile;
    if (!$profile) return false;

    if ($profile->role === 'superadmin') return true;

    return $profile->business_id === $businessId;
});
