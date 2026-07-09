<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToBranch;
use App\Models\Concerns\BelongsToBusiness;

class Supplier extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'suppliers';

    protected $fillable = [
        'id', 'business_id', 'branch_id',
        'first_name', 'last_name', 'phone', 'company',
        'total_debt', 'debt_currency', 'debt_original_amount',
        'debt_exchange_rate', 'notes', 'active',
    ];

    protected function casts(): array
    {
        return [
            'total_debt' => 'float',
            'debt_original_amount' => 'float',
            'debt_exchange_rate' => 'float',
            'active' => 'boolean',
        ];
    }
}
