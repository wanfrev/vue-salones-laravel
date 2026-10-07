<?php

namespace App\Models\Clinical;

use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;

/**
 * Bitácora de accesos al expediente clínico. De solo-anexar: se crea y se lee, nunca se modifica
 * ni se borra desde la aplicación (la única forma de borrarla es eliminar el negocio entero).
 */
class AccessLog extends Model
{
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'clinical_access_logs';

    public const UPDATED_AT = null;

    protected $fillable = [
        'id', 'business_id', 'client_id', 'case_id', 'user_id', 'action', 'resource', 'resource_id', 'detail', 'ip', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        // Devolver false cancela la operación: ni update ni delete a través del modelo.
        static::updating(fn () => false);
        static::deleting(fn () => false);
    }
}
