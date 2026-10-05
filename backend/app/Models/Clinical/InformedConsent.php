<?php

namespace App\Models\Clinical;

use App\Models\Client;
use App\Models\Concerns\BelongsToBranch;
use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Consentimiento informado de terapia — documento firmado, inmutable una vez creado. */
class InformedConsent extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'clinical_informed_consents';

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'client_id', 'created_by',
        'title', 'content', 'signature_data', 'signer_name', 'signer_relationship', 'signed_at',
    ];

    protected function casts(): array
    {
        return [
            'signed_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
