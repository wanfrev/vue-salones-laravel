<?php

namespace App\Domain\Clients\Models;

use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
    protected $table = 'clients';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'full_name',
        'phone',
        'email',
        'business_id',
        'branch_id',
        'notes',
        'birthday',
        'metadata',
    ];

    protected $casts = [
        'id' => 'string',
        'business_id' => 'string',
        'branch_id' => 'string',
        'birthday' => 'date',
        'metadata' => 'array',
    ];
}
