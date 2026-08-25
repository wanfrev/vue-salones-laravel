<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductAttributeValue extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'product_attribute_values';

    protected $fillable = [
        'id', 'attribute_id', 'value', 'sort_order',
    ];

    public function attribute(): BelongsTo
    {
        return $this->belongsTo(ProductAttribute::class, 'attribute_id');
    }
}
