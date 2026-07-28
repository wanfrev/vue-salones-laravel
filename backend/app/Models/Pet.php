<?php

namespace App\Models;

use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\BelongsToBusiness;

class Pet extends Model
{
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'pets';

    protected $fillable = [
        'id', 'business_id', 'client_id',
        'name', 'breed', 'weight', 'birthday', 'notes', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'birthday' => 'date',
            'metadata' => 'json',
        ];
    }

    protected function serializeDate(DateTimeInterface $date): string
    {
        return $date->format('Y-m-d');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
