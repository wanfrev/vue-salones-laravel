<?php

namespace App\Models\Dental;

use App\Models\Client;
use App\Models\Concerns\BelongsToBranch;
use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PerioAnnex extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'dental_perio_annexes';

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'client_id', 'created_by',
        'condiciones_clinicas', 'factores_riesgo', 'diagnostico', 'observaciones_generales',
    ];

    protected function casts(): array
    {
        return [
            'condiciones_clinicas' => 'json',
            'factores_riesgo' => 'json',
            'diagnostico' => 'json',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
