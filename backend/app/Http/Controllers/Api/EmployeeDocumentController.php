<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Services\EmployeeDocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EmployeeDocumentController
{
    public function __construct(
        private EmployeeDocumentService $documents,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        $data = $request->validate([
            'employee_id' => 'required|uuid',
        ]);

        return response()->json(
            $this->documents->forEmployee($p->business_id, $data['employee_id'])
        );
    }

    public function store(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validate([
            'employee_id' => 'required|uuid',
            'label' => 'nullable|string|max:120',
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        $document = $this->documents->store($data, $p->business_id, $request->file('file'), $p->id);
        EntityChanged::safe($p->business_id, 'employee_document', 'created', $document->id);

        return response()->json($document, 201);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $this->documents->destroy($id, $p->business_id);
        EntityChanged::safe($p->business_id, 'employee_document', 'deleted', $id);

        return response()->json(null, 204);
    }

    public function download(Request $request, string $id): StreamedResponse|JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $document = $this->documents->findForBusiness($id, $p->business_id);
        if (!Storage::disk('local')->exists($document->file_path)) {
            return response()->json(['error' => ['message' => 'Archivo no encontrado.']], 404);
        }

        return Storage::disk('local')->download($document->file_path, $document->file_original_name);
    }
}
