<?php

namespace App\Models\Clinical;

use App\Models\Client;
use App\Models\Concerns\BelongsToBranch;
use App\Models\Concerns\BelongsToBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Archivo adjunto al expediente. El contenido va cifrado en el disco privado (nunca se sirve
 * directo) y el título y nombre original también van cifrados en la base. `path` no se serializa.
 */
class Attachment extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'clinical_attachments';

    public const CATEGORIES = ['test_result', 'external_report', 'patient_material', 'other'];

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'client_id', 'uploaded_by',
        'category', 'title', 'original_name', 'mime', 'size', 'path',
    ];

    // La ruta interna del almacenamiento no sale en la API.
    protected $hidden = ['path'];

    protected function casts(): array
    {
        return [
            'title' => 'encrypted',
            'original_name' => 'encrypted',
            'size' => 'integer',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
