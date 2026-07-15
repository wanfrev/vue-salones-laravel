<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PushSubscription extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'business_id', 'profile_id',
        'endpoint', 'p256dh', 'auth', 'user_agent',
    ];
}
