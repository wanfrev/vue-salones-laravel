<?php

namespace App\Models;

use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One employee x tax-entity x year cell of the annual taxes report. */
class StaffingTaxEntry extends Model
{
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'staffing_tax_entries';

    protected $fillable = [
        'id', 'business_id', 'employee_id', 'tax_entity_id',
        'year', 'amount', 'file_path', 'file_original_name', 'entry_date', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'amount' => 'float',
            'entry_date' => 'date',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'employee_id');
    }

    public function taxEntity(): BelongsTo
    {
        return $this->belongsTo(StaffingTaxEntity::class, 'tax_entity_id');
    }
}
