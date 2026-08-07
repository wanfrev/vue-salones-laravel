<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SuperadminAuditLog extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    // Append-only trail: no updated_at, and nothing in this codebase ever calls ->update()
    // on a row of this table.
    const UPDATED_AT = null;

    protected $fillable = [
        'id', 'actor_id', 'action', 'business_id', 'target_profile_id', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'json',
        ];
    }
}
