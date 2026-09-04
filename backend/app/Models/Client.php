<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use App\Models\Concerns\BelongsToBranch;
use App\Models\Concerns\BelongsToBusiness;
use App\Models\Dental\DentalChart;

class Client extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'clients';

    protected $fillable = [
        'id', 'business_id', 'branch_id',
        'full_name', 'phone', 'email', 'client_code',
        'notes', 'birthday', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'json',
        ];
    }

    public function pets(): HasMany
    {
        return $this->hasMany(Pet::class);
    }

    public function dentalChart(): HasOne
    {
        return $this->hasOne(DentalChart::class);
    }
}
