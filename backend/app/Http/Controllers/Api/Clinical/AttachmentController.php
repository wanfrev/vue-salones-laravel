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
 * Adjuntos del expediente (resultados de pruebas, informes externos, material del paciente).
 * Cifrados en reposo; cada descarga y cada borrado queda en la auditoría. Solo el administrador
 * puede eliminar (un archivo clínico no desaparece por un descuido del equipo).
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

        return response()->json($this->service->listForClient($clientId, $businessId));
    }

    public function store(Request $request, string $clientId): JsonResponse
    {
        [$businessId, $client, $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;

        $data = $request->validate([
            'category' => ['required', Rule::in(Attachment::CATEGORIES)],
            'title' => ['required', 'string', 'max:150'],
            'file' => ['required', 'file', 'mimes:' . implode(',', AttachmentService::EXTENSIONS), 'max:' . AttachmentService::MAX_KB],
        ]);

        $attachment = $this->service->store(
            $clientId, $businessId, $client->branch_id, $request->file('file'), $data['category'], $data['title'], $request->user()?->id,
        );

        EntityChanged::safe($businessId, 'clinical_attachment', 'created', $attachment->id);
        $this->audit($request, $businessId, $clientId, 'created', 'attachment', $attachment->id);

        return response()->json($attachment, 201);
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

        if (!in_array($request->user()?->profile?->role, ['admin', 'superadmin'], true)) {
            return response()->json(['message' => 'Solo el administrador puede eliminar archivos del expediente.'], 403);
        }

        $attachment = $this->service->findForClient($id, $clientId, $businessId);
        if (!$attachment) return response()->json(['message' => 'Archivo no encontrado.'], 404);

        // Se anota qué categoría se borró (no el título, que es contenido del expediente).
        $this->audit($request, $businessId, $clientId, 'deleted', 'attachment', $attachment->id, $attachment->category);
        $this->service->delete($attachment);

        EntityChanged::safe($businessId, 'clinical_attachment', 'deleted', $id);

        return response()->json(['ok' => true]);
    }
}
