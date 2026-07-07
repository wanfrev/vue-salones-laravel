<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GiftCard extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'gift_cards';

    protected $fillable = [
        'id', 'business_id', 'branch_id',
        'recipient_name', 'recipient_phone',
        'amount', 'status', 'notes',
        'redeemed_at', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'redeemed_at' => 'datetime',
        ];
    }
}
