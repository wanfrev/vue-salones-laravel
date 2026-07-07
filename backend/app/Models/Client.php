<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'clients';

    protected $fillable = [
        'id', 'business_id', 'branch_id',
        'full_name', 'phone', 'email',
        'notes', 'birthday', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'birthday' => 'date',
            'metadata' => 'json',
        ];
    }
}
