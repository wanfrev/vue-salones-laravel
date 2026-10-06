<?php

namespace App\Services\Clinical;

use App\Models\Appointment;
use App\Models\Clinical\CaseMember;
use App\Models\Clinical\ClinicalCase;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Casos clínicos (pareja, familia, grupo). Un caso nunca se borra: se cierra. Un integrante que
 * sale conserva su fila (left_on) para seguir viendo las sesiones conjuntas en las que estuvo.
 */
class CaseService
{
    public const MIN_ACTIVE_MEMBERS = 2;
    public const COUPLE_MAX_MEMBERS = 2;

    // ── Lectura ─────────────────────────────────────────────────────────────────

    /** Casos del negocio con sus integrantes (2 consultas en total, sin N+1). */
    public function list(string $businessId, ?string $status = null): array
    {
        $cases = ClinicalCase::where('business_id', $businessId)
            ->when($status, fn ($q) => $q->where('status', $status))
            ->orderByRaw("CASE WHEN status = 'active' THEN 0 ELSE 1 END")
            ->orderByDesc('created_at')
            ->limit(200)
            ->get();

        $members = $this->membersByCase($businessId, $cases->pluck('id')->all());

        return $cases->map(fn (ClinicalCase $c) => $this->present($c, $members->get($c->id, collect())))->all();
    }

    public function find(string $id, string $businessId): ?ClinicalCase
    {
        return ClinicalCase::where('id', $id)->where('business_id', $businessId)->first();
    }

    public function show(ClinicalCase $case): array
    {
        return $this->present($case, $this->membersByCase($case->business_id, [$case->id])->get($case->id, collect()));
    }

    /** Casos de los que el paciente es o fue integrante (para su ficha y para vincular citas). */
    public function forClient(string $clientId, string $businessId): array
    {
        $rows = DB::table('clinical_case_members as m')
            ->join('clinical_cases as c', 'c.id', '=', 'm.case_id')
            ->where('m.business_id', $businessId)
            ->where('m.client_id', $clientId)
            ->orderByDesc('c.created_at')
            ->get(['c.id', 'c.type', 'c.name', 'c.status', 'm.role', 'm.is_primary', 'm.left_on']);

        return $rows->map(fn ($r) => [
            'id' => $r->id,
            'type' => $r->type,
            'name' => $r->name,
            'status' => $r->status,
            'role' => $r->role,
            'is_primary' => (bool) $r->is_primary,
            'active_member' => $r->left_on === null,
        ])->all();
    }

    public function titular(ClinicalCase $case): ?string
    {
        return CaseMember::where('case_id', $case->id)->where('is_primary', true)->whereNull('left_on')->value('client_id');
    }

    // ── Escritura ───────────────────────────────────────────────────────────────

    /**
     * @param  array{type: string, name: string, opened_on?: ?string, members: array<int, array{client_id: string, role?: ?string}>, primary_client_id?: ?string}  $data
     */
    public function create(string $businessId, ?string $branchId, array $data, ?string $createdBy): ClinicalCase
    {
        $members = collect($data['members'])->unique('client_id')->values();
        $this->assertMemberCount($data['type'], $members->count());
        $this->assertClientsBelong($members->pluck('client_id')->all(), $businessId);

        $primary = $data['primary_client_id'] ?? $members->first()['client_id'];
        if (!$members->contains('client_id', $primary)) {
            throw new InvalidArgumentException('El titular debe ser uno de los integrantes.');
        }

        return DB::transaction(function () use ($businessId, $branchId, $data, $createdBy, $members, $primary) {
            $case = ClinicalCase::create([
                'id' => Str::uuid()->toString(),
                'business_id' => $businessId,
                'branch_id' => $branchId,
                'created_by' => $createdBy,
                'type' => $data['type'],
                'name' => $data['name'],
                'status' => 'active',
                'opened_on' => $data['opened_on'] ?? now()->toDateString(),
            ]);

            foreach ($members as $m) {
                $this->insertMember($case, $m['client_id'], $m['role'] ?? null, $m['client_id'] === $primary);
            }

            return $case;
        });
    }

    /** Nombre, estado y titular. Cerrar fija la fecha de cierre; reabrir la limpia. */
    public function update(ClinicalCase $case, array $data): ClinicalCase
    {
        return DB::transaction(function () use ($case, $data) {
            $changes = array_intersect_key($data, array_flip(['name', 'opened_on']));

            if (isset($data['status']) && $data['status'] !== $case->status) {
                $changes['status'] = $data['status'];
                $changes['closed_on'] = $data['status'] === 'closed' ? now()->toDateString() : null;
            }
            $case->update($changes);

            if (!empty($data['primary_client_id'])) {
                $this->setPrimary($case, $data['primary_client_id']);
            }

            return $case->fresh();
        });
    }

    public function addMember(ClinicalCase $case, string $clientId, ?string $role): CaseMember
    {
        if ($case->status !== 'active') {
            throw new InvalidArgumentException('El caso está cerrado.');
        }
        $this->assertClientsBelong([$clientId], $case->business_id);

        $active = $this->activeCount($case);
        $existing = CaseMember::where('case_id', $case->id)->where('client_id', $clientId)->first();

        // Un integrante que había salido puede volver: se reactiva en vez de duplicar la fila.
        if ($existing) {
            if ($existing->left_on === null) {
                throw new InvalidArgumentException('Esa persona ya es integrante del caso.');
            }
            $this->assertMemberCount($case->type, $active + 1);
            $existing->update(['left_on' => null, 'role' => $role ?? $existing->role]);

            return $existing->fresh();
        }

        $this->assertMemberCount($case->type, $active + 1);

        return $this->insertMember($case, $clientId, $role, false);
    }

    /** El integrante sale (left_on); su fila y sus sesiones conjuntas se conservan. */
    public function removeMember(ClinicalCase $case, string $clientId): void
    {
        $member = CaseMember::where('case_id', $case->id)->where('client_id', $clientId)->whereNull('left_on')->first();
        if (!$member) {
            throw new InvalidArgumentException('Esa persona no es integrante activo del caso.');
        }
        if ($this->activeCount($case) <= self::MIN_ACTIVE_MEMBERS) {
            throw new InvalidArgumentException('Un caso necesita al menos 2 integrantes activos; ciérralo en vez de dejarlo con uno.');
        }

        DB::transaction(function () use ($case, $member) {
            $member->update(['left_on' => now()->toDateString(), 'is_primary' => false]);

            // Si salió el titular, el primer integrante activo toma su lugar (siempre debe haber uno).
            if ($this->titular($case) === null) {
                $next = CaseMember::where('case_id', $case->id)->whereNull('left_on')->orderBy('created_at')->orderBy('id')->first();
                $next?->update(['is_primary' => true]);
            }
        });
    }

    public function setPrimary(ClinicalCase $case, string $clientId): void
    {
        $member = CaseMember::where('case_id', $case->id)->where('client_id', $clientId)->whereNull('left_on')->first();
        if (!$member) {
            throw new InvalidArgumentException('El titular debe ser un integrante activo.');
        }

        DB::transaction(function () use ($case, $member) {
            CaseMember::where('case_id', $case->id)->update(['is_primary' => false]);
            $member->update(['is_primary' => true]);
        });
    }

    // ── Citas ───────────────────────────────────────────────────────────────────

    /** Vincula una cita a un caso: debe ser del negocio y de un integrante ACTIVO del caso. */
    public function linkAppointment(ClinicalCase $case, string $appointmentId, ?string $userId): void
    {
        if ($case->status !== 'active') {
            throw new InvalidArgumentException('El caso está cerrado.');
        }

        $appointment = Appointment::where('id', $appointmentId)->where('business_id', $case->business_id)->first();
        if (!$appointment) {
            throw new InvalidArgumentException('Cita no encontrada.');
        }

        $isMember = CaseMember::where('case_id', $case->id)->where('client_id', $appointment->client_id)->whereNull('left_on')->exists();
        if (!$isMember) {
            throw new InvalidArgumentException('La cita es de alguien que no es integrante activo de este caso.');
        }

        DB::table('clinical_case_appointments')->updateOrInsert(
            ['appointment_id' => $appointmentId],
            ['business_id' => $case->business_id, 'case_id' => $case->id, 'linked_by' => $userId, 'created_at' => now()],
        );
    }

    public function unlinkAppointment(string $appointmentId, string $businessId): void
    {
        DB::table('clinical_case_appointments')->where('appointment_id', $appointmentId)->where('business_id', $businessId)->delete();
    }

    /** Caso al que está vinculada la cita (id, nombre, tipo) o null. */
    public function caseForAppointment(string $appointmentId, string $businessId): ?array
    {
        $row = DB::table('clinical_case_appointments as ca')
            ->join('clinical_cases as c', 'c.id', '=', 'ca.case_id')
            ->where('ca.appointment_id', $appointmentId)
            ->where('ca.business_id', $businessId)
            ->first(['c.id', 'c.name', 'c.type', 'c.status']);

        return $row ? (array) $row : null;
    }

    // ── Internos ────────────────────────────────────────────────────────────────

    private function insertMember(ClinicalCase $case, string $clientId, ?string $role, bool $primary): CaseMember
    {
        return CaseMember::create([
            'id' => Str::uuid()->toString(),
            'business_id' => $case->business_id,
            'case_id' => $case->id,
            'client_id' => $clientId,
            'role' => $role,
            'is_primary' => $primary,
            'joined_on' => now()->toDateString(),
        ]);
    }

    private function activeCount(ClinicalCase $case): int
    {
        return CaseMember::where('case_id', $case->id)->whereNull('left_on')->count();
    }

    private function assertMemberCount(string $type, int $count): void
    {
        if ($count < self::MIN_ACTIVE_MEMBERS) {
            throw new InvalidArgumentException('Un caso necesita al menos 2 integrantes.');
        }
        if ($type === 'couple' && $count > self::COUPLE_MAX_MEMBERS) {
            throw new InvalidArgumentException('Un caso de pareja tiene exactamente 2 integrantes; usa «familia» o «grupo» para más.');
        }
    }

    /** Todos los pacientes deben existir y ser de ESTE negocio (nunca enlazar a un paciente ajeno). */
    private function assertClientsBelong(array $clientIds, string $businessId): void
    {
        $found = DB::table('clients')->where('business_id', $businessId)->whereIn('id', $clientIds)->count();
        if ($found !== count(array_unique($clientIds))) {
            throw new InvalidArgumentException('Alguno de los pacientes no existe en este negocio.');
        }
    }

    /** Integrantes agrupados por caso, con nombre y teléfono (un solo JOIN). */
    private function membersByCase(string $businessId, array $caseIds): Collection
    {
        if (!$caseIds) {
            return collect();
        }

        return DB::table('clinical_case_members as m')
            ->join('clients as c', 'c.id', '=', 'm.client_id')
            ->where('m.business_id', $businessId)
            ->whereIn('m.case_id', $caseIds)
            ->orderByDesc('m.is_primary')
            ->orderBy('m.created_at')
            ->get(['m.case_id', 'm.client_id', 'c.full_name as client_name', 'c.phone', 'm.role', 'm.is_primary', 'm.joined_on', 'm.left_on'])
            ->map(fn ($r) => [
                'case_id' => $r->case_id,
                'client_id' => $r->client_id,
                'client_name' => $r->client_name,
                'phone' => $r->phone,
                'role' => $r->role,
                'is_primary' => (bool) $r->is_primary,
                'joined_on' => $r->joined_on,
                'left_on' => $r->left_on,
            ])
            ->groupBy('case_id');
    }

    private function present(ClinicalCase $case, Collection $members): array
    {
        return [
            'id' => $case->id,
            'type' => $case->type,
            'name' => $case->name,
            'status' => $case->status,
            'opened_on' => $case->opened_on?->toDateString(),
            'closed_on' => $case->closed_on?->toDateString(),
            'members' => $members->map(fn ($m) => collect($m)->except('case_id')->all())->values()->all(),
        ];
    }
}
