<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToBusiness;

class Notification extends Model
{
    use BelongsToBusiness;
    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'notifications';
    public const CREATED_AT = 'created_at';
    public const UPDATED_AT = null;

    protected $fillable = [
        'id', 'business_id', 'profile_id',
        'type', 'title', 'message',
        'appointment_id', 'client_name', 'client_phone',
        'service_name', 'appointment_time',
        'metadata', 'is_read', 'read_at', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
            'metadata' => 'json',
            'appointment_time' => 'datetime',
            'read_at' => 'datetime',
        ];
    }
}
