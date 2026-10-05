<?php

namespace App\Services\Clinical;

use App\Models\Appointment;
use App\Models\Clinical\SessionNote;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SessionNoteService
{
    private const EDITABLE = [
        'appointment_id', 'session_date', 'duration_minutes', 'risk_level', 'mood_rating', 'content', 'tasks',
    ];

    public function listForClient(string $clientId, string $businessId)
    {
        return SessionNote::where('client_id', $clientId)
            ->where('business_id', $businessId)
            ->orderByDesc('session_date')
            ->orderByDesc('session_number')
            ->get();
    }

    public function findForClient(string $id, string $clientId, string $businessId): ?SessionNote
    {
        return SessionNote::where('id', $id)
            ->where('client_id', $clientId)
            ->where('business_id', $businessId)
            ->first();
    }

    /** ¿La cita existe, es de este negocio y pertenece a este paciente? */
    public function appointmentBelongsToClient(?string $appointmentId, string $clientId, string $businessId): bool
    {
        if (!$appointmentId) {
            return true;
        }

        return Appointment::where('id', $appointmentId)
            ->where('business_id', $businessId)
            ->where('client_id', $clientId)
            ->exists();
    }

    /** Últimas citas del paciente, para vincular una nota a la sesión agendada (acotado a 30). */
    public function recentAppointments(string $clientId, string $businessId): array
    {
        // Vía el modelo (no DB::table) para que start_time salga con el mismo cast/zona horaria
        // ISO que el resto de la API de citas.
        return Appointment::with('service:id,name')
            ->where('business_id', $businessId)
            ->where('client_id', $clientId)
            ->orderByDesc('start_time')
            ->limit(30)
            ->get(['id', 'start_time', 'status', 'service_id'])
            ->map(fn (Appointment $a) => [
                'id' => $a->id,
                'start_time' => $a->start_time?->toIso8601String(),
                'status' => $a->status,
                'service_name' => $a->service?->name,
            ])
            ->all();
    }

    public function create(string $clientId, string $businessId, ?string $branchId, array $data, ?string $createdBy): SessionNote
    {
        return DB::transaction(function () use ($clientId, $businessId, $branchId, $data, $createdBy) {
            // Serializa la numeración por paciente: dos notas simultáneas no comparten número.
            DB::table('clients')->where('id', $clientId)->lockForUpdate()->value('id');
            $next = (int) (SessionNote::where('client_id', $clientId)->max('session_number') ?? 0) + 1;

            return SessionNote::create([
                'id' => Str::uuid()->toString(),
                'business_id' => $businessId,
                'branch_id' => $branchId,
                'client_id' => $clientId,
                'appointment_id' => $data['appointment_id'] ?? null,
                'created_by' => $createdBy,
                'session_number' => $next,
                'session_date' => $data['session_date'],
                'duration_minutes' => $data['duration_minutes'] ?? null,
                'risk_level' => $data['risk_level'] ?? 'none',
                'mood_rating' => $data['mood_rating'] ?? null,
                'content' => $data['content'] ?? [],
                'tasks' => $data['tasks'] ?? null,
            ]);
        });
    }

    public function update(SessionNote $note, array $data): SessionNote
    {
        $note->update(array_intersect_key($data, array_flip(self::EDITABLE)));

        return $note->fresh();
    }
}
