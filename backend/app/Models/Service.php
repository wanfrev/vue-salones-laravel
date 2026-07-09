<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Concerns\BelongsToBranch;
use App\Models\Concerns\BelongsToBusiness;

class Service extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'service_category_id',
        'name', 'description', 'duration_minutes', 'price',
        'local_percentage', 'color', 'category', 'icon', 'active',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'price' => 'float',
            'local_percentage' => 'float',
            'duration_minutes' => 'integer',
        ];
    }
}
