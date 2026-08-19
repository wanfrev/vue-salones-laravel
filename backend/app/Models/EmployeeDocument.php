<?php

namespace App\Models;

use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A scanned document (ID, work letter, contract, etc.) attached to an employee's profile. */
class EmployeeDocument extends Model
{
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'employee_documents';

    protected $fillable = [
        'id', 'business_id', 'employee_id', 'label', 'file_path', 'file_original_name', 'uploaded_by',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'employee_id');
    }
}
