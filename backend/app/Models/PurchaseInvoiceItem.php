<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseInvoiceItem extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'purchase_invoice_items';

    protected $fillable = [
        'id', 'purchase_invoice_id', 'product_id', 'quantity', 'unit_cost', 'line_total',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'float',
            'unit_cost' => 'float',
            'line_total' => 'float',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(PurchaseInvoice::class, 'purchase_invoice_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
