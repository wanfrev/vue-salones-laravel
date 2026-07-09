<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\BelongsToBranch;
use App\Models\Concerns\BelongsToBusiness;

class InventoryStock extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'inventory_stock';
    public $timestamps = false;

    protected $fillable = [
        'id', 'business_id', 'branch_id',
        'location_id', 'product_id', 'variant_id',
        'quantity', 'reserved_qty', 'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'float',
            'reserved_qty' => 'float',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(InventoryLocation::class, 'location_id');
    }
}
