<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Concerns\BelongsToBranch;
use App\Models\Concerns\BelongsToBusiness;

class Credit extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'client_id', 'client_name', 'client_phone',
        'transaction_id', 'amount', 'paid_amount', 'currency', 'status', 'paid_at', 'paid_method',
        'created_by',
    ];

    protected $appends = ['remaining', 'sale_total', 'paid_at_sale'];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'paid_amount' => 'float',
            'paid_at' => 'datetime',
        ];
    }

    public function getRemainingAttribute(): float
    {
        return round((float) $this->amount - (float) $this->paid_amount, 2);
    }

    /**
     * Total de la venta que originó el crédito. `amount` es solo la parte que quedó a crédito: en un pago mixto
     * (p. ej. $14,01 con gift card + $100,99 a crédito) la venta fue de $115,00. Solo se calcula si la transacción
     * viene cargada (`with('transaction')`); si no, es null y la pantalla muestra `amount` como antes.
     */
    public function getSaleTotalAttribute(): ?float
    {
        if (!$this->relationLoaded('transaction') || !$this->transaction) {
            return null;
        }

        // Nunca por debajo de lo que quedó a crédito, aunque la transacción se haya editado después.
        return round(max((float) $this->transaction->total_amount, (float) $this->amount), 2);
    }

    /**
     * Lo que se pagó en el momento de la venta (la parte que NO quedó a crédito). Ya está cobrado e incluido en el
     * ingreso de la venta; no es un abono de este crédito y no se suma a `paid_amount`.
     */
    public function getPaidAtSaleAttribute(): ?float
    {
        $sale = $this->sale_total;

        return $sale === null ? null : round($sale - (float) $this->amount, 2);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(CreditPayment::class);
    }
}
