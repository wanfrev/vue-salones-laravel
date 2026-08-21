<?php

namespace App\Models;

use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StaffingProject extends Model
{
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'staffing_projects';

    protected $fillable = [
        'id', 'business_id', 'company_id', 'name', 'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(StaffingCompany::class, 'company_id');
    }

    public function employees(): HasMany
    {
        return $this->hasMany(StaffingCompanyEmployee::class, 'project_id');
    }

    public function timesheets(): HasMany
    {
        return $this->hasMany(StaffingTimesheet::class, 'project_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(StaffingInvoice::class, 'project_id');
    }
}
