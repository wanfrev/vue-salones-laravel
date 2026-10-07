<?php

namespace App\Models\Clinical;

use App\Models\Client;
use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CaseMember extends Model
{
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'clinical_case_members';

    protected $fillable = [
        'id', 'business_id', 'case_id', 'client_id', 'role', 'is_primary', 'joined_on', 'left_on',
    ];

    protected function casts(): array
    {
        return [
            'is_primary' => 'boolean',
            'joined_on' => 'date:Y-m-d',
            'left_on' => 'date:Y-m-d',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
