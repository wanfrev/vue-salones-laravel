<?php

namespace App\Models;

use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffingIncidentFile extends Model
{
    use BelongsToBusiness;

    public const TYPE_FACTURA = 'factura';
    public const TYPE_PAPERWORK = 'paperwork';
    public const TYPE_DRUG_TEST = 'drug_test';
    public const TYPE_FOTO = 'foto';

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'staffing_incident_files';

    protected $fillable = [
        'id', 'business_id', 'incident_id', 'file_type', 'file_path', 'file_original_name', 'uploaded_by',
    ];

    public function incident(): BelongsTo
    {
        return $this->belongsTo(StaffingIncident::class, 'incident_id');
    }
}
