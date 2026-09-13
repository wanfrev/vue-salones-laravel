<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToBusiness;

class Bank extends Model
{
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'business_id', 'name', 'active',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
        ];
    }
}
