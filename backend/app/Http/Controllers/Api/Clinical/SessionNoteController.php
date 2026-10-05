<?php

namespace App\Http\Controllers\Api\Clinical;

use App\Events\EntityChanged;
use App\Http\Controllers\Api\Clinical\Concerns\ClinicalRecordAccess;
use App\Services\Clinical\SessionNoteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SessionNoteController
{
    use ClinicalRecordAccess;

    public function __construct(private SessionNoteService $service)
    {
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'appointment_id' => ['nullable', 'uuid'],
            'session_date' => ['required', 'date_format:Y-m-d'],
            'duration_minutes' => ['nullable', 'integer', 'min:1', 'max:600'],
            'risk_level' => ['required', 'in:none,low,moderate,high'],
            'mood_rating' => ['nullable', 'integer', 'min:1', 'max:10'],
            'content' => ['required', 'array'],
            'content.subjective' => ['nullable', 'string', 'max:20000'],
            'content.objective' => ['nullable', 'string', 'max:20000'],
            'content.assessment' => ['nullable', 'string', 'max:20000'],
            'content.plan' => ['nullable', 'string', 'max:20000'],
            'tasks' => ['nullable', 'string', 'max:5000'],
        ]);

        // Solo las 4 secciones SOAP — nada más entra al cuerpo cifrado.
        $data['content'] = array_intersect_key($data['content'], array_flip(['subjective', 'objective', 'assessment', 'plan']));

        return $data;
    }

    public function index(Request $request, string $clientId): JsonResponse
    {
        [$businessId, , $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;

        return response()->json($this->service->listForClient($clientId, $businessId));
    }

    public function appointments(Request $request, string $clientId): JsonResponse
    {
        [$businessId, , $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;

        return response()->json($this->service->recentAppointments($clientId, $businessId));
    }

    public function show(Request $request, string $clientId, string $id): JsonResponse
    {
        [$businessId, , $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;

        $note = $this->service->findForClient($id, $clientId, $businessId);
        if (!$note) return response()->json(['message' => 'Nota de sesión no encontrada.'], 404);

        return response()->json($note);
    }

    public function store(Request $request, string $clientId): JsonResponse
    {
        [$businessId, $client, $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;

        $data = $this->validated($request);

        if (!$this->service->appointmentBelongsToClient($data['appointment_id'] ?? null, $clientId, $businessId)) {
            return response()->json(['message' => 'La cita seleccionada no corresponde a este paciente.'], 422);
        }

        $note = $this->service->create($clientId, $businessId, $client->branch_id, $data, $request->user()?->id);

        EntityChanged::safe($businessId, 'clinical_session_note', 'created', $note->id);

        return response()->json($note, 201);
    }

    public function update(Request $request, string $clientId, string $id): JsonResponse
    {
        [$businessId, , $error] = $this->resolveClinicalContext($request, $clientId);
        if ($error) return $error;

        $note = $this->service->findForClient($id, $clientId, $businessId);
        if (!$note) return response()->json(['message' => 'Nota de sesión no encontrada.'], 404);

        // Una nota clínica solo la corrige su autor (o un administrador).
        if (!$this->canModify($request, $note->created_by)) {
            return response()->json(['message' => 'Solo el autor de la nota puede editarla.'], 403);
        }

        $data = $this->validated($request);

        if (!$this->service->appointmentBelongsToClient($data['appointment_id'] ?? null, $clientId, $businessId)) {
            return response()->json(['message' => 'La cita seleccionada no corresponde a este paciente.'], 422);
        }

        $note = $this->service->update($note, $data);

        EntityChanged::safe($businessId, 'clinical_session_note', 'updated', $note->id);

        return response()->json($note);
    }
}
