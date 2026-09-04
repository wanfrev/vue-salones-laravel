<?php

namespace App\Models\Dental;

use App\Models\Client;
use App\Models\Concerns\BelongsToBranch;
use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One row per "folio" (per the SmilePUJ format this niche's clinic uses) — a patient can have
 * several over time, none are overwritten. The most recent by folio_number is the current one.
 */
class ClinicalHistory extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'dental_clinical_histories';

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'client_id', 'folio_number', 'created_by',
        'anamnesis', 'examen_fisico', 'examenes_complementarios', 'diagnostico',
        'certificado_veracidad', 'observaciones_generales',
    ];

    protected function casts(): array
    {
        return [
            'anamnesis' => 'json',
            'examen_fisico' => 'json',
            'examenes_complementarios' => 'json',
            'diagnostico' => 'json',
            'certificado_veracidad' => 'boolean',
            'folio_number' => 'integer',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
