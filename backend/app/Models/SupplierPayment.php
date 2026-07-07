<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierPayment extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'supplier_payments';

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'supplier_id',
        'amount', 'payment_method', 'payment_date',
        'notes', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'payment_date' => 'date',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }
}
