<?php

namespace App\Models\Clinical;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\Concerns\BelongsToBranch;
use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Nota de sesión (SOAP). El cuerpo y las tareas se cifran en reposo; risk_level queda en claro. */
class SessionNote extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'clinical_session_notes';

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'client_id', 'appointment_id', 'created_by',
        'session_number', 'session_date', 'duration_minutes', 'risk_level', 'mood_rating',
        'content', 'tasks',
    ];

    protected function casts(): array
    {
        return [
            'session_number' => 'integer',
            'session_date' => 'date:Y-m-d',
            'duration_minutes' => 'integer',
            'mood_rating' => 'integer',
            'content' => 'encrypted:array',
            'tasks' => 'encrypted',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }
}
