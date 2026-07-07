<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Service extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'service_category_id',
        'name', 'description', 'duration_minutes', 'price',
        'local_percentage', 'color', 'category', 'icon', 'active',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'price' => 'float',
            'local_percentage' => 'float',
            'duration_minutes' => 'integer',
        ];
    }
}
