<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'products';

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'category_id',
        'name', 'description', 'sku', 'barcode', 'unit',
        'unit_cost', 'unit_price', 'reorder_point',
        'active', 'is_sellable', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'is_sellable' => 'boolean',
            'unit_cost' => 'float',
            'unit_price' => 'float',
            'reorder_point' => 'float',
            'metadata' => 'json',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ProductCategory::class, 'category_id');
    }

    public function stocks(): HasMany
    {
        return $this->hasMany(InventoryStock::class);
    }
}
