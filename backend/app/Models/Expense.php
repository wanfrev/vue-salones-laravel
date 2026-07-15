<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToBranch;
use App\Models\Concerns\BelongsToBusiness;

class Expense extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'expenses';

    protected $fillable = [
        'id', 'business_id', 'branch_id',
        'name', 'category', 'amount', 'expense_date',
        'currency', 'original_amount', 'exchange_rate_used',
        'notes', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'original_amount' => 'float',
            'exchange_rate_used' => 'float',
        ];
    }
}
