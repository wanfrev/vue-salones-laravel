<?php

namespace App\Models;

use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StaffingTimesheet extends Model
{
    use BelongsToBusiness;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_PAID = 'paid';

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'staffing_timesheets';

    protected $fillable = [
        'id', 'business_id', 'company_id',
        'week_start', 'week_end', 'status', 'terms_snapshot', 'notes', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'week_start' => 'date',
            'week_end' => 'date',
            'terms_snapshot' => 'array',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(StaffingCompany::class, 'company_id');
    }

    public function entries(): HasMany
    {
        return $this->hasMany(StaffingTimesheetEntry::class, 'timesheet_id');
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }
}
