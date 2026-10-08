<?php

namespace App\Models;

use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Schema;

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
        'id', 'business_id', 'company_id', 'project_id',
        'week_start', 'week_end', 'status', 'terms_snapshot', 'notes', 'created_by',
        'approved_by', 'approved_at', 'approval_code',
    ];

    /** Always serialized; null unless the `approver.profile` relation was eager loaded. */
    protected $appends = ['approver_name'];

    /** Only the name is exposed — never the whole User/Profile the relation would drag along. */
    protected $hidden = ['approver'];

    protected function casts(): array
    {
        return [
            'week_start' => 'date',
            'week_end' => 'date',
            'terms_snapshot' => 'array',
            'approved_at' => 'datetime',
        ];
    }

    /**
     * The approval-stamp columns come from an opt-in migration. Every read/write of them is gated on
     * this, so the code is safe to deploy before the migration has been applied.
     */
    public static function stampColumnsExist(): bool
    {
        static $exists = null;

        return $exists ??= Schema::hasColumn('staffing_timesheets', 'approval_code');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function getApproverNameAttribute(): ?string
    {
        return $this->relationLoaded('approver') ? $this->approver?->profile?->full_name : null;
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(StaffingCompany::class, 'company_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(StaffingProject::class, 'project_id');
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
