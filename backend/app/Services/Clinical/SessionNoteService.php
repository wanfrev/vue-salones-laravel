<?php

namespace App\Services\Clinical;

use App\Models\Appointment;
use App\Models\Clinical\ClinicalCase;
use App\Models\Clinical\SessionNote;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Notas de sesión. Dos mundos que NUNCA se mezclan:
 *   - individuales: case_id NULL, numeradas por paciente;
 *   - conjuntas (pareja/familia/grupo): case_id = el caso, numeradas por caso, client_id = titular.
 * Todo método "ForClient" excluye las conjuntas; las conjuntas se piden por caso o con jointForClient().
 */
class SessionNoteService
{
    private const EDITABLE = [
        'appointment_id', 'session_date', 'duration_minutes', 'risk_level', 'mood_rating', 'content', 'tasks',
    ];

    // ── Individuales ────────────────────────────────────────────────────────────

    public function listForClient(string $clientId, string $businessId)
    {
        return SessionNote::where('client_id', $clientId)
            ->whereNull('case_id')
            ->where('business_id', $businessId)
            ->orderByDesc('session_date')
            ->orderByDesc('session_number')
            ->get();
    }

    public function findForClient(string $id, string $clientId, string $businessId): ?SessionNote
    {
        return SessionNote::where('id', $id)
            ->where('client_id', $clientId)
            ->whereNull('case_id')
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
            ->map(fn (Appointment $a) => $this->appointmentRow($a))
            ->all();
    }

    public function create(string $clientId, string $businessId, ?string $branchId, array $data, ?string $createdBy): SessionNote
    {
        return DB::transaction(function () use ($clientId, $businessId, $branchId, $data, $createdBy) {
            // Serializa la numeración por paciente: dos notas simultáneas no comparten número.
            DB::table('clients')->where('id', $clientId)->lockForUpdate()->value('id');
            $next = (int) (SessionNote::where('client_id', $clientId)->whereNull('case_id')->max('session_number') ?? 0) + 1;

            return $this->insert($clientId, null, $businessId, $branchId, $next, $data, $createdBy);
        });
    }

    public function update(SessionNote $note, array $data): SessionNote
    {
        $note->update(array_intersect_key($data, array_flip(self::EDITABLE)));

        return $note->fresh();
    }

    // ── Conjuntas (por caso) ────────────────────────────────────────────────────

    public function listForCase(string $caseId, string $businessId)
    {
        return SessionNote::where('case_id', $caseId)
            ->where('business_id', $businessId)
            ->orderByDesc('session_date')
            ->orderByDesc('session_number')
            ->get();
    }

    public function findForCase(string $id, string $caseId, string $businessId): ?SessionNote
    {
        return SessionNote::where('id', $id)
            ->where('case_id', $caseId)
            ->where('business_id', $businessId)
            ->first();
    }

    public function createForCase(ClinicalCase $case, string $titularId, ?string $branchId, array $data, ?string $createdBy): SessionNote
    {
        return DB::transaction(function () use ($case, $titularId, $branchId, $data, $createdBy) {
            DB::table('clinical_cases')->where('id', $case->id)->lockForUpdate()->value('id');
            $next = (int) (SessionNote::where('case_id', $case->id)->max('session_number') ?? 0) + 1;

            return $this->insert($titularId, $case->id, $case->business_id, $branchId, $next, $data, $createdBy);
        });
    }

    /**
     * Notas conjuntas de los casos de los que el paciente es o fue integrante, con el nombre del
     * caso — para mostrarlas (solo lectura) en su ficha. Una consulta con JOIN, acotada.
     *
     * @return array<int, SessionNote>
     */
    public function jointForClient(string $clientId, string $businessId, int $limit = 100): array
    {
        $caseNames = DB::table('clinical_case_members as m')
            ->join('clinical_cases as c', 'c.id', '=', 'm.case_id')
            ->where('m.business_id', $businessId)
            ->where('m.client_id', $clientId)
            ->pluck('c.name', 'c.id');

        if ($caseNames->isEmpty()) {
            return [];
        }

        return SessionNote::where('business_id', $businessId)
            ->whereIn('case_id', $caseNames->keys())
            ->orderByDesc('session_date')
            ->orderByDesc('session_number')
            ->limit($limit)
            ->get()
            ->each(fn (SessionNote $n) => $n->setAttribute('case_name', $caseNames[$n->case_id] ?? null))
            ->all();
    }

    /** Citas vinculadas al caso (las últimas 30), para elegir a cuál corresponde la nota conjunta. */
    public function recentCaseAppointments(string $caseId, string $businessId): array
    {
        return Appointment::with('service:id,name')
            ->join('clinical_case_appointments as ca', 'ca.appointment_id', '=', 'appointments.id')
            ->where('ca.case_id', $caseId)
            ->where('appointments.business_id', $businessId)
            ->orderByDesc('appointments.start_time')
            ->limit(30)
            ->get(['appointments.id', 'appointments.start_time', 'appointments.status', 'appointments.service_id'])
            ->map(fn (Appointment $a) => $this->appointmentRow($a))
            ->all();
    }

    public function appointmentLinkedToCase(?string $appointmentId, string $caseId): bool
    {
        if (!$appointmentId) {
            return true;
        }

        return DB::table('clinical_case_appointments')
            ->where('appointment_id', $appointmentId)
            ->where('case_id', $caseId)
            ->exists();
    }

    // ── Compartido ──────────────────────────────────────────────────────────────

    private function insert(string $clientId, ?string $caseId, string $businessId, ?string $branchId, int $number, array $data, ?string $createdBy): SessionNote
    {
        return SessionNote::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
            'branch_id' => $branchId,
            'client_id' => $clientId,
            'case_id' => $caseId,
            'appointment_id' => $data['appointment_id'] ?? null,
            'created_by' => $createdBy,
            'session_number' => $number,
            'session_date' => $data['session_date'],
            'duration_minutes' => $data['duration_minutes'] ?? null,
            'risk_level' => $data['risk_level'] ?? 'none',
            'mood_rating' => $data['mood_rating'] ?? null,
            'content' => $data['content'] ?? [],
            'tasks' => $data['tasks'] ?? null,
        ]);
    }

    private function appointmentRow(Appointment $a): array
    {
        return [
            'id' => $a->id,
            'start_time' => $a->start_time?->toIso8601String(),
            'status' => $a->status,
            'service_name' => $a->service?->name,
        ];
    }
}
