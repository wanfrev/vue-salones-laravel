<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Concerns\BelongsToBusiness;

class Profile extends Model
{
    use BelongsToBusiness;
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'business_id', 'full_name', 'role', 'phone', 'avatar_url',
        'active', 'email', 'job_title',
        'pay_type', 'pay_percentage', 'base_salary', 'salary_frequency',
        'employee_ves_rate',
        'disable_agenda',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'disable_agenda' => 'boolean',
            'pay_percentage' => 'float',
            'base_salary' => 'float',
            'employee_ves_rate' => 'float',
        ];
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(EmployeeSchedule::class, 'employee_id');
    }
}
