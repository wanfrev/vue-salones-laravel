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
        'approved_by', 'approved_at', 'approval_code', 'approval_signature', 'approved_by_name',
    ];

    /** Always serialized; null unless the `approver.profile` relation was eager loaded. */
    protected $appends = ['approver_name', 'has_approval_signature'];

    /**
     * Only the name is exposed — never the whole User/Profile the relation would drag along — and
     * the signature image itself stays out of list payloads (fetched on demand when printing).
     */
    protected $hidden = ['approver', 'approval_signature'];

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

    /** The drawn-signature column comes from a second opt-in migration; same guard as above. */
    public static function signatureColumnExists(): bool
    {
        static $exists = null;

        return $exists ??= Schema::hasColumn('staffing_timesheets', 'approval_signature');
    }

    /** The approver-name snapshot column (2026_10_14) — also guards deploying before the migration. */
    public static function approverNameColumnExists(): bool
    {
        static $exists = null;

        return $exists ??= Schema::hasColumn('staffing_timesheets', 'approved_by_name');
    }

    public function getHasApprovalSignatureAttribute(): bool
    {
        return !empty($this->attributes['approval_signature'] ?? null);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function getApproverNameAttribute(): ?string
    {
        // The boss who signed (frozen at approval) wins: the login that approved is a shared admin
        // account, so its own name would say nothing about who actually did it.
        return ($this->attributes['approved_by_name'] ?? null)
            ?: ($this->relationLoaded('approver') ? $this->approver?->profile?->full_name : null);
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
