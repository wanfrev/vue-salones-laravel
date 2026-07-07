<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryMovement extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'inventory_movements';
    public const CREATED_AT = 'created_at';
    public const UPDATED_AT = null;

    protected $fillable = [
        'id', 'business_id', 'branch_id',
        'location_id', 'product_id', 'variant_id',
        'movement_type', 'quantity', 'unit_cost',
        'exchange_rate_used', 'reference_type', 'reference_id',
        'notes', 'created_by', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'float',
            'unit_cost' => 'float',
            'exchange_rate_used' => 'float',
        ];
    }
}
