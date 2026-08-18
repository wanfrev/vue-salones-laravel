<?php

namespace App\Models;

use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A material item (vehicle, phone, laptop, etc.) assigned to an employee. */
class EmployeeAsset extends Model
{
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'employee_assets';

    protected $fillable = [
        'id', 'business_id', 'employee_id', 'asset_type', 'description',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'employee_id');
    }
}
