<?php

namespace App\Models\Clinical;

use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;

/** Programa de sesiones que se cobra junto (catálogo del negocio). Ver clinical_programs. */
class Program extends Model
{
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'clinical_programs';

    protected $fillable = ['id', 'business_id', 'created_by', 'name', 'price', 'validity_days', 'components', 'active'];

    protected function casts(): array
    {
        return [
            'price' => 'float',
            'validity_days' => 'integer',
            'components' => 'array',
            'active' => 'boolean',
        ];
    }

    /** Total de sesiones del programa (suma de las cantidades de sus componentes). */
    public function sessionsTotal(): int
    {
        return (int) array_sum(array_map(fn ($c) => (int) ($c['quantity'] ?? 0), $this->components ?? []));
    }
}
