<?php

namespace App\Models;

use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffingCompanyPayment extends Model
{
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'staffing_company_payments';

    protected $fillable = [
        'id', 'business_id', 'company_id', 'invoice_id',
        'amount', 'payment_method', 'payment_date', 'reference', 'notes', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'payment_date' => 'date',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(StaffingCompany::class, 'company_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(StaffingInvoice::class, 'invoice_id');
    }
}
