<?php

namespace App\Models;

use App\Models\Concerns\BelongsToBranch;
use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StaffingCompany extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'staffing_companies';

    protected $fillable = [
        'id', 'business_id', 'branch_id',
        'name', 'legal_name', 'address', 'city', 'state', 'zip', 'work_site',
        'contact_name', 'contact_phone', 'contact_email',
        'payment_terms_days',
        'overtime_threshold_hours', 'overtime_multiplier',
        'tax_brackets', 'tax_destination', 'payout_rounding',
        'active', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'payment_terms_days' => 'integer',
            'overtime_threshold_hours' => 'float',
            'overtime_multiplier' => 'float',
            'tax_brackets' => 'array',
            'active' => 'boolean',
        ];
    }

    public function rates(): HasMany
    {
        return $this->hasMany(StaffingCompanyRate::class, 'company_id');
    }
}
