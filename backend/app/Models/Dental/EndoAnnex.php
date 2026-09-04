<?php

namespace App\Models\Dental;

use App\Models\Client;
use App\Models\Concerns\BelongsToBranch;
use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EndoAnnex extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'dental_endo_annexes';

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'client_id', 'tooth_number', 'created_by',
        'examen', 'diagnostico', 'tratamiento',
    ];

    protected function casts(): array
    {
        return [
            'examen' => 'json',
            'diagnostico' => 'json',
            'tratamiento' => 'json',
            'tooth_number' => 'integer',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
