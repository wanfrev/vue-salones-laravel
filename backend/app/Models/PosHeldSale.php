<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToBranch;
use App\Models\Concerns\BelongsToBusiness;

class PosHeldSale extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'pos_held_sales';

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'created_by',
        'client_id', 'client_name', 'client_phone',
        'cart', 'payment_method', 'payment_currency', 'payments_breakdown',
        'tip_amount', 'tip_currency', 'notes',
        'custom_total_amount', 'custom_total_currency', 'are_products_included',
        'total_amount',
    ];

    protected function casts(): array
    {
        return [
            'cart' => 'array',
            'payments_breakdown' => 'array',
            'tip_amount' => 'float',
            'custom_total_amount' => 'float',
            'are_products_included' => 'boolean',
            'total_amount' => 'float',
        ];
    }
}
