<?php

namespace App\Models;

use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;

/** A free-entry income row for the staffing niche's Finanzas > Ingresos, alongside invoiced hours. */
class StaffingManualIncome extends Model
{
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'staffing_manual_incomes';

    protected $fillable = [
        'id', 'business_id', 'income_date', 'amount', 'notes', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'income_date' => 'date',
            'amount' => 'float',
        ];
    }
}
