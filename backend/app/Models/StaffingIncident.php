<?php

namespace App\Models;

use App\Models\Concerns\BelongsToBranch;
use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StaffingIncident extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public const STATUS_ACTIVO = 'activo';
    public const STATUS_LIGHT_DUTY = 'light_duty';
    public const STATUS_SUSPENDIDO = 'suspendido';
    public const STATUS_DESPEDIDO = 'despedido';

    public const DRUG_TEST_POSITIVO = 'positivo';
    public const DRUG_TEST_NEGATIVO = 'negativo';
    public const DRUG_TEST_PENDIENTE = 'pendiente';

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'staffing_incidents';

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'employee_id', 'company_id',
        'comments', 'incident_date', 'follow_up_date', 'wants_urgent_care',
        'status', 'drug_test_result',
        'reporte_file_path', 'reporte_file_original_name',
        'relief_form_file_path', 'relief_form_file_original_name',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'incident_date' => 'date',
            'follow_up_date' => 'date',
            'wants_urgent_care' => 'boolean',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'employee_id');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(StaffingCompany::class, 'company_id');
    }

    public function files(): HasMany
    {
        return $this->hasMany(StaffingIncidentFile::class, 'incident_id');
    }
}
