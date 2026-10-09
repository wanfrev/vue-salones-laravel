<?php

namespace App\Models\Clinical;

use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;

/** Sesión de una inscripción = una cita (appointment_id). Ver clinical_program_sessions. */
class EnrollmentSession extends Model
{
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'appointment_id';
    protected $table = 'clinical_program_sessions';

    protected $fillable = ['appointment_id', 'business_id', 'enrollment_id', 'position', 'consumes'];

    protected function casts(): array
    {
        return ['position' => 'integer', 'consumes' => 'boolean'];
    }
}
