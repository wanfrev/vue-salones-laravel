<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Concerns\BelongsToBranch;
use App\Models\Concerns\BelongsToBusiness;

class Appointment extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'client_id', 'pet_id', 'employee_id',
        'service_id', 'assistant_employee_id', 'start_time', 'end_time',
        'status', 'payment_status', 'service_notes', 'internal_notes',
        'source', 'created_by', 'group_id', 'price_override',
        'employee_percentage_override', 'assistant_percentage',
        'duration_override',
    ];

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    public function employeeProfile(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'employee_id');
    }

    public function assistantProfile(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'assistant_employee_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }
}
