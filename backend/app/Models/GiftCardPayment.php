<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Cómo se pagó una gift card al venderla. Dinero recibido (entra al Cuadre del Día), no ingreso de Finanzas: ver la
 * migración create_gift_card_payments_table.
 */
class GiftCardPayment extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'gift_card_payments';

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'gift_card_id',
        'amount', 'payments_breakdown', 'exchange_rate', 'paid_at', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'payments_breakdown' => 'array',
            'exchange_rate' => 'float',
            'paid_at' => 'datetime',
        ];
    }

    public function giftCard(): BelongsTo
    {
        return $this->belongsTo(GiftCard::class);
    }
}
