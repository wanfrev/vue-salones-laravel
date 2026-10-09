<?php

namespace App\Models\Clinical;

use App\Models\Concerns\BelongsToBranch;
use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Inscripción de un paciente en un programa. Ver clinical_program_enrollments. */
class Enrollment extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'clinical_program_enrollments';

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'program_id', 'client_id', 'created_by',
        'program_name', 'price', 'sessions_total', 'starts_on', 'expires_on', 'status',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'float',
            'sessions_total' => 'integer',
            'starts_on' => 'date:Y-m-d',
            'expires_on' => 'date:Y-m-d',
        ];
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(EnrollmentSession::class, 'enrollment_id');
    }
}
