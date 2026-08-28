<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class WhatsAppInstance extends Model
{
    // Laravel's naming convention would guess "whats_app_instances" (it splits "WhatsApp" into
    // "Whats" + "App" as separate words) — the migration actually created "whatsapp_instances".
    protected $table = 'whatsapp_instances';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'instance_id', 'instance_status', 'instance_number',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}
