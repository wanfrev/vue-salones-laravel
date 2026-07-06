<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Business extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'name', 'slug', 'phone', 'address', 'timezone', 'currency',
        'ves_exchange_rate', 'employee_ves_rate', 'niche_type',
        'theme_config', 'terminology', 'job_titles', 'service_categories',
        'features', 'multi_branch_enabled', 'active',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'multi_branch_enabled' => 'boolean',
            'ves_exchange_rate' => 'float',
            'employee_ves_rate' => 'float',
            'theme_config' => 'json',
            'terminology' => 'json',
            'job_titles' => 'json',
            'service_categories' => 'json',
            'features' => 'json',
        ];
    }

    public function profiles(): HasMany
    {
        return $this->hasMany(Profile::class);
    }

    public function branches(): HasMany
    {
        return $this->hasMany(Branch::class);
    }

    public function services(): HasMany
    {
        return $this->hasMany(Service::class);
    }
}
