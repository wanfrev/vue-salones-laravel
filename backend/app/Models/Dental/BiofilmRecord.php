<?php

namespace App\Models\Dental;

use App\Models\Client;
use App\Models\Concerns\BelongsToBranch;
use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BiofilmRecord extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'dental_biofilm_records';

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'client_id', 'created_by',
        'teeth', 'observaciones_generales',
    ];

    protected function casts(): array
    {
        return [
            'teeth' => 'json',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
