<?php

namespace App\Models;

use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Pago del servicio de Luma que el superadmin marcó como recibido. Ver BillingService. */
class BusinessBillingPayment extends Model
{
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    public const UPDATED_AT = null;

    protected $fillable = [
        'id', 'business_id', 'amount', 'currency', 'paid_on', 'covered_due_on', 'kind', 'notes',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'paid_on' => 'date:Y-m-d',
            'covered_due_on' => 'date:Y-m-d',
        ];
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
