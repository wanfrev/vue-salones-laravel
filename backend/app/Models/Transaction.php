<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'appointment_id',
        'total_amount', 'local_amount', 'employee_amount', 'assistant_amount',
        'local_percentage', 'employee_percentage', 'assistant_percentage',
        'method', 'exchange_rate_used', 'payments_breakdown', 'tip_amount',
        'created_by', 'notes', 'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'total_amount' => 'float',
            'local_amount' => 'float',
            'employee_amount' => 'float',
            'assistant_amount' => 'float',
            'tip_amount' => 'float',
            'exchange_rate_used' => 'float',
            'payments_breakdown' => 'json',
        ];
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }
}
