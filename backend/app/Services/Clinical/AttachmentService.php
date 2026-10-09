<?php

namespace App\Services\Clinical;

use App\Models\Clinical\Attachment;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Adjuntos del expediente. Todo va cifrado en reposo: el contenido del archivo (AES vía Crypt, en
 * el disco privado) y el título/nombre original (en la base). Nada se sirve directo desde disco:
 * la descarga descifra en memoria y solo la entrega un endpoint autenticado y auditado.
 */
class AttachmentService
{
    public const DISK = 'local';
    public const MAX_KB = 10240;
    public const EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'doc', 'docx'];
    public const LIST_LIMIT = 200;

    public function listForClient(string $clientId, string $businessId)
    {
        return Attachment::where('client_id', $clientId)
            ->where('business_id', $businessId)
            ->orderByDesc('created_at')
            ->limit(self::LIST_LIMIT)
            ->get();
    }

    public function findForClient(string $id, string $clientId, string $businessId): ?Attachment
    {
        return Attachment::where('id', $id)
            ->where('client_id', $clientId)
            ->where('business_id', $businessId)
            ->first();
    }

    public function store(string $clientId, string $businessId, ?string $branchId, UploadedFile $file, string $category, string $title, ?string $userId, ?string $documentDate = null): Attachment
    {
        $id = Str::uuid()->toString();
        // Nombre en disco sin relación con el original (y sin extensión útil): no revela nada.
        $path = "clinical/{$businessId}/{$clientId}/{$id}.enc";

        $plain = file_get_contents($file->getRealPath());
        Storage::disk(self::DISK)->put($path, Crypt::encryptString($plain));

        try {
            return DB::transaction(fn () => Attachment::create([
                'id' => $id,
                'business_id' => $businessId,
                'branch_id' => $branchId,
                'client_id' => $clientId,
                'uploaded_by' => $userId,
                'category' => $category,
                'title' => $title,
                'document_date' => $documentDate,
                'original_name' => $this->safeName($file->getClientOriginalName()),
                // El tipo real se detecta por contenido, no por lo que declare el navegador.
                'mime' => $file->getMimeType() ?: 'application/octet-stream',
                'size' => strlen($plain),
                'path' => $path,
            ]));
        } catch (\Throwable $e) {
            Storage::disk(self::DISK)->delete($path); // sin fila no debe quedar un archivo huérfano
            throw $e;
        }
    }

    /**
     * Contenido descifrado. Lanza \RuntimeException si el archivo no está o no se puede descifrar
     * (p. ej. cambió APP_KEY) — el controller lo traduce a un error claro.
     */
    public function contents(Attachment $attachment): string
    {
        $disk = Storage::disk(self::DISK);
        if (!$disk->exists($attachment->path)) {
            throw new \RuntimeException('El archivo ya no está en el almacenamiento.');
        }

        try {
            return Crypt::decryptString($disk->get($attachment->path));
        } catch (\Illuminate\Contracts\Encryption\DecryptException) {
            throw new \RuntimeException('No se pudo descifrar el archivo.');
        }
    }

    public function delete(Attachment $attachment): void
    {
        DB::transaction(function () use ($attachment) {
            $path = $attachment->path;
            $attachment->delete();
            Storage::disk(self::DISK)->delete($path);
        });
    }

    /** Solo el nombre base, sin rutas ni caracteres de control (el nombre se usa luego en la descarga). */
    private function safeName(string $name): string
    {
        $base = basename(str_replace('\\', '/', $name));
        $base = preg_replace('/[\x00-\x1F\x7F"]/u', '', $base) ?? '';

        return Str::limit($base !== '' ? $base : 'archivo', 200, '');
    }
}
