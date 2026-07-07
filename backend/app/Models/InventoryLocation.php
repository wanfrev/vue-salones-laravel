<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryLocation extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'inventory_locations';

    protected $fillable = [
        'id', 'business_id', 'branch_id',
        'name', 'is_default', 'active', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
            'active' => 'boolean',
            'metadata' => 'json',
        ];
    }
}
