<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Profile extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'business_id',
        'full_name',
        'role',
        'phone',
        'avatar_url',
        'active',
        'email',
        'job_title',
        'pay_type',
        'pay_percentage',
        'base_salary',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'pay_percentage' => 'float',
            'base_salary' => 'float',
        ];
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}
