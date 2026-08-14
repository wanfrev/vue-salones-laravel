<?php

namespace App\Models;

use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Lead extends Model
{
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';

    public const STATUSES = ['new', 'called', 'answered', 'emailed', 'meeting', 'won', 'lost'];

    protected $fillable = [
        'id', 'business_id', 'owner_id',
        'company_name', 'work_area', 'address', 'phone',
        'status', 'notes',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'owner_id');
    }
}
