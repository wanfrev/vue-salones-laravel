<?php

namespace App\Models;

use App\Models\Concerns\BelongsToBranch;
use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Header for a supplier invoice being received into inventory — the "factura de compra" an
 * employee vacía from the paper document. Its items each bump stock and leave a matching
 * InventoryMovement (reference_type 'purchase_invoice') so it shows up in the same Movimientos
 * kardex as any other stock change, and the printed PDF (client-side) is what gets checked
 * against the physical invoice afterward.
 */
class PurchaseInvoice extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'purchase_invoices';

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'supplier_id', 'invoice_number',
        'invoice_date', 'total', 'notes', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'invoice_date' => 'date',
            'total' => 'float',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    // Named 'creator', not 'createdBy' — Eloquent serializes relation keys to snake_case
    // ('created_by'), which would collide with the raw created_by column on this same model.
    public function creator(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseInvoiceItem::class);
    }
}
