<?php

namespace App\Models;

use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** "Otros gastos" on the weekly staffing report — one manual, editable amount per (company, week). */
class StaffingWeeklyExpense extends Model
{
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'staffing_weekly_expenses';

    protected $fillable = [
        'id', 'business_id', 'company_id',
        'week_start', 'amount', 'notes', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'week_start' => 'date',
            'amount' => 'float',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(StaffingCompany::class, 'company_id');
    }
}
