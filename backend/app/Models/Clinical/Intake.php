<?php

namespace App\Models\Clinical;

use App\Models\Client;
use App\Models\Concerns\BelongsToBranch;
use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Historia clínica psicológica — una viva por paciente, cifrada en reposo. */
class Intake extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'clinical_intakes';

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'client_id', 'created_by', 'updated_by', 'data',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'encrypted:array',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
