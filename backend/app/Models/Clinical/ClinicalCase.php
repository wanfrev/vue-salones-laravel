<?php

namespace App\Models\Clinical;

use App\Models\Concerns\BelongsToBranch;
use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Caso = pareja, familia o grupo en tratamiento conjunto. Las notas y el plan conjuntos cuelgan de
 * él (case_id). Nunca se borra: se cierra (status = closed).
 */
class ClinicalCase extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'clinical_cases';

    public const TYPES = ['couple', 'family', 'group'];

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'created_by', 'type', 'name', 'status', 'opened_on', 'closed_on',
    ];

    protected function casts(): array
    {
        return [
            'opened_on' => 'date:Y-m-d',
            'closed_on' => 'date:Y-m-d',
        ];
    }

    public function members(): HasMany
    {
        return $this->hasMany(CaseMember::class, 'case_id');
    }
}
