<?php

namespace App\Http\Controllers\Api\Clinical;

use App\Events\EntityChanged;
use App\Http\Controllers\Api\Clinical\Concerns\ClinicalRecordAccess;
use App\Models\Clinical\Attachment;
use App\Services\Clinical\AttachmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Adjuntos del expediente (resultados de pruebas, informes, consentimientos, exámenes, material...).
 * Cifrados en reposo; cada descarga y cada borrado queda en la auditoría. Eliminar es del administrador
 * (un archivo clínico no desaparece por un descuido del equipo); quien subió un archivo puede
 * quitarlo durante las primeras 24 horas, por si se equivocó de archivo o de paciente.
 */
class AttachmentController
{
    use ClinicalRecordAccess;

    public function __construct(private AttachmentService $service)
    {
    }

    public function index(Request $request, string $clientId): JsonResponse
    {
        [$businessId, , $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;

        $this->audit($request, $businessId, $clientId, 'viewed', 'attachment');

        return response()->json($this->present($request, $this->service->listForClient($clientId, $businessId)->all()));
    }

    /**
     * Cada archivo sale con quién lo subió (para organizar el expediente) y si ESTE usuario puede borrarlo,
     * para que la pantalla muestre el botón solo cuando el servidor lo va a aceptar.
     *
     * @param  Attachment[]  $attachments
     */
    private function present(Request $request, array $attachments): array
    {
        $names = \App\Models\Profile::whereIn('id', array_filter(array_unique(array_map(fn ($a) => $a->uploaded_by, $attachments))))
            ->pluck('full_name', 'id');

        return array_map(fn (Attachment $a) => $a->toArray() + [
            'uploaded_by_name' => $names[$a->uploaded_by] ?? null,
            'can_delete' => $this->canDelete($request, $a),
        ], $attachments);
    }

    /** Administrador siempre; cualquier otro, solo lo que él mismo subió durante las primeras 24 horas. */
    private function canDelete(Request $request, Attachment $attachment): bool
    {
        if (in_array($request->user()?->profile?->role, ['admin', 'superadmin'], true)) {
            return true;
        }

        $userId = $request->user()?->id;

        return $userId !== null
            && $attachment->uploaded_by === $userId
            && $attachment->created_at !== null
            && $attachment->created_at->gt(now()->subHours(Attachment::SELF_DELETE_HOURS));
    }

    public function store(Request $request, string $clientId): JsonResponse
    {
        [$businessId, $client, $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;

        $data = $request->validate([
            'category' => ['required', Rule::in(Attachment::CATEGORIES)],
            'title' => ['required', 'string', 'max:150'],
            'document_date' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:tomorrow'], // «mañana»: tolera el desfase de zona horaria
            'file' => ['required', 'file', 'mimes:' . implode(',', AttachmentService::EXTENSIONS), 'max:' . AttachmentService::MAX_KB],
        ]);

        $attachment = $this->service->store(
            $clientId, $businessId, $client->branch_id, $request->file('file'), $data['category'], $data['title'], $request->user()?->id, $data['document_date'] ?? null,
        );

        EntityChanged::safe($businessId, 'clinical_attachment', 'created', $attachment->id);
        $this->audit($request, $businessId, $clientId, 'created', 'attachment', $attachment->id);

        return response()->json($this->present($request, [$attachment])[0], 201);
    }

    public function download(Request $request, string $clientId, string $id): StreamedResponse|JsonResponse
    {
        [$businessId, , $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;

        $attachment = $this->service->findForClient($id, $clientId, $businessId);
        if (!$attachment) return response()->json(['message' => 'Archivo no encontrado.'], 404);

        try {
            $bytes = $this->service->contents($attachment);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        // Se registra ANTES de entregar: si la entrega se corta a medias, el acceso igual quedó anotado.
        $this->audit($request, $businessId, $clientId, 'downloaded', 'attachment', $attachment->id);

        return response()->streamDownload(
            fn () => print($bytes),
            $attachment->original_name,
            ['Content-Type' => $attachment->mime, 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff'],
        );
    }

    public function destroy(Request $request, string $clientId, string $id): JsonResponse
    {
        [$businessId, , $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;

        $attachment = $this->service->findForClient($id, $clientId, $businessId);
        if (!$attachment) return response()->json(['message' => 'Archivo no encontrado.'], 404);

        if (!$this->canDelete($request, $attachment)) {
            return response()->json(['message' => 'Solo el administrador puede eliminar archivos del expediente (quien lo subió puede hacerlo durante las primeras ' . Attachment::SELF_DELETE_HOURS . ' horas).'], 403);
        }

        // Se anota qué categoría se borró (no el título, que es contenido del expediente).
        $this->audit($request, $businessId, $clientId, 'deleted', 'attachment', $attachment->id, $attachment->category);
        $this->service->delete($attachment);

        EntityChanged::safe($businessId, 'clinical_attachment', 'deleted', $id);

        return response()->json(['ok' => true]);
    }
}
