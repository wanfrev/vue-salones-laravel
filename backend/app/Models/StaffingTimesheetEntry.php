<?php

namespace App\Models;

use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffingTimesheetEntry extends Model
{
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'staffing_timesheet_entries';

    protected $fillable = [
        'id', 'business_id', 'timesheet_id', 'employee_id',
        'total_hours', 'pre_tax_deduction', 'fixed_fees', 'adjustment',
        'pay_rate', 'bill_rate',
        'regular_hours', 'overtime_hours', 'gross', 'tax_withheld', 'net', 'payout', 'carried',
        'invoice_total', 'employer_cost', 'margin',
    ];

    protected function casts(): array
    {
        return [
            'total_hours' => 'float',
            'pre_tax_deduction' => 'float',
            'fixed_fees' => 'float',
            'adjustment' => 'float',
            'pay_rate' => 'float',
            'bill_rate' => 'float',
            'regular_hours' => 'float',
            'overtime_hours' => 'float',
            'gross' => 'float',
            'tax_withheld' => 'float',
            'net' => 'float',
            'payout' => 'float',
            'carried' => 'float',
            'invoice_total' => 'float',
            'employer_cost' => 'float',
            'margin' => 'float',
        ];
    }

    public function timesheet(): BelongsTo
    {
        return $this->belongsTo(StaffingTimesheet::class, 'timesheet_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'employee_id');
    }
}
