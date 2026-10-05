<?php

namespace App\Models\Clinical;

use App\Models\Client;
use App\Models\Concerns\BelongsToBranch;
use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Aplicación de un cuestionario estandarizado (PHQ-9, GAD-7). Inmutable una vez guardada. */
class Assessment extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'clinical_assessments';

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'client_id', 'created_by',
        'instrument', 'answers', 'total_score', 'severity', 'risk_flag', 'notes', 'assessed_at',
    ];

    protected function casts(): array
    {
        return [
            'answers' => 'array',
            'total_score' => 'integer',
            'risk_flag' => 'boolean',
            'assessed_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
