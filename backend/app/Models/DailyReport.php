<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyReport extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'business_id',
        'branch_id',
        'user_id',
        'date',
        'exchange_rate',
        'z_report_bs',
        'z_report_usd',
        'pos_bs',
        'pago_movil_bs',
        'cash_bs',
        'transfer_bs',
        'cash_usd',
        'zelle_usd',
        'binance_usd',
        'cashea_usd',
        'card_usd',
        'gift_card_usd',
        'other_usd',
        'other_bs',
        'credit_usd',
        'credit_bs',
        'credits_detail',
        'total_bs',
        'total_usd',
    ];

    protected $casts = [
        'exchange_rate' => 'float',
        'z_report_bs' => 'float',
        'z_report_usd' => 'float',
        'pos_bs' => 'float',
        'pago_movil_bs' => 'float',
        'cash_bs' => 'float',
        'transfer_bs' => 'float',
        'cash_usd' => 'float',
        'zelle_usd' => 'float',
        'binance_usd' => 'float',
        'cashea_usd' => 'float',
        'card_usd' => 'float',
        'gift_card_usd' => 'float',
        'other_usd' => 'float',
        'other_bs' => 'float',
        'credit_usd' => 'float',
        'credit_bs' => 'float',
        'credits_detail' => 'array',
        'total_bs' => 'float',
        'total_usd' => 'float',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
