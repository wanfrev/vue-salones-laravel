<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Appointment extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
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
