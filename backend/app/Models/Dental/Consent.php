<?php

namespace App\Models\Dental;

use App\Models\Client;
use App\Models\Concerns\BelongsToBranch;
use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Documento legal firmado — inmutable una vez creado, sin método de update. */
class Consent extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'dental_consents';

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'client_id', 'created_by',
        'procedure_description', 'risks_text', 'signature_data', 'signed_at',
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
