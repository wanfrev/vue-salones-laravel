<?php

namespace App\Models;

use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffingCompanyRate extends Model
{
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'staffing_company_rates';

    protected $fillable = [
        'id', 'business_id', 'company_id',
        'role', 'pay_rate', 'bill_rate', 'active',
    ];

    protected function casts(): array
    {
        return [
            'pay_rate' => 'float',
            'bill_rate' => 'float',
            'active' => 'boolean',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(StaffingCompany::class, 'company_id');
    }

    /** What the agency keeps per hour on this role, before withholdings and fees. */
    public function hourlyMargin(): float
    {
        return $this->bill_rate - $this->pay_rate;
    }
}
