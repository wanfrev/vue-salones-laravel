<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductVariant extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'product_variants';

    protected $fillable = [
        'id', 'product_id', 'branch_id',
        'name', 'sku', 'unit_cost', 'unit_price',
        'metadata', 'active',
    ];

    protected function casts(): array
    {
        return [
            'unit_cost' => 'float',
            'unit_price' => 'float',
            'metadata' => 'json',
            'active' => 'boolean',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
