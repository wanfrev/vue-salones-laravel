<?php

namespace App\Models\Clinical;

use App\Models\Client;
use App\Models\Concerns\BelongsToBranch;
use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Plan terapéutico — enfoque, formulación del caso y objetivos. `data` cifrado en reposo. */
class TreatmentPlan extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'clinical_treatment_plans';

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'client_id', 'case_id', 'created_by',
        'status', 'start_date', 'end_date', 'data',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
            'data' => 'encrypted:array',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
