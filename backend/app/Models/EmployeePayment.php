<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\BelongsToBranch;
use App\Models\Concerns\BelongsToBusiness;

class EmployeePayment extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'employee_payments';

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'employee_id',
        'amount', 'currency', 'original_amount', 'exchange_rate_used',
        'payment_method', 'type', 'concept', 'notes', 'payment_date',
        'created_by', 'created_at', 'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'original_amount' => 'float',
            'exchange_rate_used' => 'float',
            'payment_date' => 'date',
        ];
    }

    public function employeeProfile(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'employee_id');
    }
}
