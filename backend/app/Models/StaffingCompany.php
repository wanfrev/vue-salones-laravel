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

    public const STATUS_ACTIVE = 'active';
    public const STATUS_INACTIVE = 'inactive';
    public const STATUS_ON_HOLD = 'on_hold';

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
        'active', 'status', 'notes',
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

    /**
     * Keeps the legacy `active` boolean and the tri-state `status` in sync both ways, so every
     * existing `where('active', ...)` query and every existing `->update(['active' => false])`
     * call site keeps working unchanged after `status` (active|inactive|on_hold) was introduced.
     */
    protected static function booted(): void
    {
        static::saving(function (self $company) {
            if ($company->isDirty('status')) {
                $company->active = $company->status === self::STATUS_ACTIVE;
            } elseif ($company->isDirty('active') && !$company->isDirty('status')) {
                $company->status = $company->active ? self::STATUS_ACTIVE : self::STATUS_INACTIVE;
            }
        });
    }

    public function rates(): HasMany
    {
        return $this->hasMany(StaffingCompanyRate::class, 'company_id');
    }
}
