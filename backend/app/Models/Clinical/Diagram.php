<?php

namespace App\Models\Clinical;

use App\Models\Concerns\BelongsToBranch;
use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;

/** Genograma o línea de vida de un paciente o de un caso. `data` cifrado en reposo. */
class Diagram extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'clinical_diagrams';

    public const TYPES = ['genogram', 'life_line'];

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'client_id', 'case_id', 'created_by', 'updated_by', 'type', 'data',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'encrypted:array',
        ];
    }
}
