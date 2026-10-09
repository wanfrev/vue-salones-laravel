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

    // La columna `category` admite hasta 20 caracteres. Las cuatro primeras son las originales.
    public const CATEGORIES = ['test_result', 'external_report', 'patient_material', 'other', 'consent', 'medical_exam', 'school'];

    /** Un empleado puede borrar lo que él mismo subió durante este tiempo (por un error de subida); después, solo el administrador. */
    public const SELF_DELETE_HOURS = 24;

    protected $fillable = [
        'id', 'business_id', 'branch_id', 'client_id', 'uploaded_by',
        'category', 'title', 'document_date', 'original_name', 'mime', 'size', 'path',
    ];

    // La ruta interna del almacenamiento no sale en la API.
    protected $hidden = ['path'];

    protected function casts(): array
    {
        return [
            'title' => 'encrypted',
            'original_name' => 'encrypted',
            'size' => 'integer',
            'document_date' => 'date:Y-m-d',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
