<?php

namespace App\Models;

use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Rastro de quién corrigió o eliminó un cobro, y qué aspecto tenía antes -- para que una
 * corrección legítima no se confunda con un cobro fantasma (ver la investigación de Armonic que
 * motivó esto). Es un registro de solo lectura: nunca se edita ni se borra un log una vez creado.
 */
class TransactionAuditLog extends Model
{
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';

    const UPDATED_AT = null;

    protected $fillable = [
        'id', 'business_id', 'transaction_id', 'branch_id', 'action',
        'performed_by', 'reason', 'before_snapshot', 'after_snapshot',
    ];

    protected function casts(): array
    {
        return [
            'before_snapshot' => 'array',
            'after_snapshot' => 'array',
        ];
    }

    public function performedBy(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'performed_by');
    }
}
