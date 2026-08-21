<?php

namespace App\Models;

use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StaffingInvoice extends Model
{
    use BelongsToBusiness;

    public const STATUS_SENT = 'sent';
    public const STATUS_PARTIAL = 'partial';
    public const STATUS_PAID = 'paid';

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'staffing_invoices';

    protected $fillable = [
        'id', 'business_id', 'company_id', 'project_id', 'timesheet_id',
        'invoice_number', 'issue_date', 'due_date', 'terms_days', 'work_site',
        'subtotal', 'total', 'status',
    ];

    protected function casts(): array
    {
        return [
            'issue_date' => 'date',
            'due_date' => 'date',
            'terms_days' => 'integer',
            'subtotal' => 'float',
            'total' => 'float',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(StaffingCompany::class, 'company_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(StaffingProject::class, 'project_id');
    }

    public function timesheet(): BelongsTo
    {
        return $this->belongsTo(StaffingTimesheet::class, 'timesheet_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(StaffingCompanyPayment::class, 'invoice_id');
    }
}
