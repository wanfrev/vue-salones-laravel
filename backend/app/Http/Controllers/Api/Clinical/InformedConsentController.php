<?php

namespace App\Http\Controllers\Api\Clinical;

use App\Events\EntityChanged;
use App\Http\Controllers\Api\Clinical\Concerns\ClinicalRecordAccess;
use App\Services\Clinical\InformedConsentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Consentimiento informado de terapia — solo lectura y alta; una vez firmado no se edita. */
class InformedConsentController
{
    use ClinicalRecordAccess;

    public function __construct(private InformedConsentService $service)
    {
    }

    public function index(Request $request, string $clientId): JsonResponse
    {
        [$businessId, , $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;

        return response()->json($this->service->listForClient($clientId, $businessId));
    }

    public function show(Request $request, string $clientId, string $id): JsonResponse
    {
        [$businessId, , $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;

        $consent = $this->service->findForClient($id, $clientId, $businessId);
        if (!$consent) return response()->json(['message' => 'Consentimiento no encontrado.'], 404);

        return response()->json($consent);
    }

    public function store(Request $request, string $clientId): JsonResponse
    {
        [$businessId, $client, $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string'],
            'signature_data' => ['required', 'string'],
            'signer_name' => ['nullable', 'string', 'max:255'],
            'signer_relationship' => ['nullable', 'string', 'max:255'],
        ]);

        $consent = $this->service->create($clientId, $businessId, $client->branch_id, $data, $request->user()?->id);

        EntityChanged::safe($businessId, 'clinical_informed_consent', 'created', $consent->id);

        return response()->json($consent, 201);
    }
}
