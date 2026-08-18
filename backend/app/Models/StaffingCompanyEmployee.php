<?php

namespace App\Models;

use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One row per (company, employee) a staffing worker is currently assigned to — the role here is
 * specific to that company (rates are per company+role, so the same person can be a "Vendedor"
 * at one client and a "Supervisor" at another). See migration 2026_08_17_000000 for why this
 * replaced the old single profiles.staffing_company_id/staffing_role columns.
 */
class StaffingCompanyEmployee extends Model
{
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'staffing_company_employees';

    protected $fillable = [
        'id', 'business_id', 'company_id', 'employee_id', 'role',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(StaffingCompany::class, 'company_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'employee_id');
    }
}
