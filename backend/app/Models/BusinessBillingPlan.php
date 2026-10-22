<?php

namespace App\Models;

use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;

/** Plan de cobro del servicio de Luma para un negocio. Ver BillingService. */
class BusinessBillingPlan extends Model
{
    use BelongsToBusiness;

    public const CYCLES = ['monthly', 'quarterly', 'semiannual', 'annual', 'none'];

    /** Meses que avanza la próxima fecha de pago por ciclo ('none' = no se repite). */
    public const CYCLE_MONTHS = ['monthly' => 1, 'quarterly' => 3, 'semiannual' => 6, 'annual' => 12];

    public const DEFAULT_REMIND_DAYS = [5, 3, 1];

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'business_id', 'enabled', 'currency', 'trial_ends_on', 'initial_amount', 'cycle',
        'recurring_amount', 'next_due_on', 'next_is_initial', 'remind_days_before',
        'payment_instructions', 'custom_message',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'next_is_initial' => 'boolean',
            'trial_ends_on' => 'date:Y-m-d',
            'next_due_on' => 'date:Y-m-d',
            'initial_amount' => 'float',
            'recurring_amount' => 'float',
            'remind_days_before' => 'array',
        ];
    }
}
