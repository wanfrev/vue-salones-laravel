<?php

namespace App\Services\Clinical;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\Clinical\Enrollment;
use App\Models\Clinical\EnrollmentSession;
use App\Models\Clinical\Program;
use App\Models\Profile;
use App\Models\Service;
use App\Services\AppointmentService;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

/**
 * Inscripciones a programas. Inscribir crea de una vez las citas de todas las sesiones (citas normales:
 * se editan, mueven y marcan igual que cualquier otra) y las vincula en `clinical_program_sessions`.
 *
 * Conteo: una sesión se gasta cuando su cita se realizó o el paciente no asistió (inasistencia sin aviso);
 * una cita cancelada no se gasta. Quien administra puede forzar el criterio de una sesión (`consumes`).
 *
 * Cobro: el programa se paga junto en el POS. Allí sus citas salen como UN cobro agrupado (ver
 * groupPendingForPos) y el POS reparte el monto entre las citas con su flujo de grupos de siempre; cada
 * cita guarda su parte del precio en `price_override`, así que sumadas dan el precio del programa.
 */
class EnrollmentService
{
    public function __construct(private AppointmentService $appointments)
    {
    }

    // ── Inscribir ───────────────────────────────────────────────────────────────

    /**
     * @param array<int, array{service_id: string, start_time: string}> $sessions
     *
     * @throws InvalidArgumentException con un mensaje listo para mostrar
     */
    public function enroll(string $businessId, Client $client, Program $program, string $employeeId, array $sessions, ?string $branchId, ?string $userId, ?string $startsOn = null): Enrollment
    {
        if (!$program->active) {
            throw new InvalidArgumentException('Ese programa está desactivado.');
        }
        $total = $program->sessionsTotal();
        if (count($sessions) !== $total) {
            throw new InvalidArgumentException("El programa tiene {$total} sesiones; se enviaron " . count($sessions) . '.');
        }
        if (!Profile::where('business_id', $businessId)->where('id', $employeeId)->exists()) {
            throw new InvalidArgumentException('El profesional no pertenece a este negocio.');
        }

        $services = Service::where('business_id', $businessId)->whereIn('id', array_column($sessions, 'service_id'))->get()->keyBy('id');
        $this->assertSessionsFitComponents($program, $sessions);

        // Cronológico: la sesión 1 es la primera en el tiempo, no la primera en llegar.
        usort($sessions, fn ($a, $b) => Carbon::parse($a['start_time'])->getTimestamp() <=> Carbon::parse($b['start_time'])->getTimestamp());

        $first = Carbon::parse($sessions[0]['start_time'])->utc();
        $last = Carbon::parse($sessions[$total - 1]['start_time'])->utc();
        $validity = max(1, $program->validity_days);
        if ($last->gt($first->copy()->addDays($validity))) {
            throw new InvalidArgumentException("Las {$total} sesiones deben quedar dentro de los {$validity} días de vigencia del programa (la última cae el {$last->format('d/m/Y')}).");
        }

        $slices = $this->priceSlices($program->price, $total);

        // Fecha local de la primera sesión (la que ve el usuario); sin ella, la fecha UTC de la primera cita.
        $startDate = Carbon::parse($startsOn ?? $first->toDateString());

        return DB::transaction(function () use ($businessId, $client, $program, $employeeId, $sessions, $services, $branchId, $userId, $slices, $total, $startDate, $validity) {
            $enrollment = Enrollment::create([
                'id' => Str::uuid()->toString(),
                'business_id' => $businessId,
                'branch_id' => $branchId,
                'program_id' => $program->id,
                'client_id' => $client->id,
                'created_by' => $userId,
                'program_name' => $program->name,
                'price' => $program->price,
                'sessions_total' => $total,
                'starts_on' => $startDate->toDateString(),
                'expires_on' => $startDate->copy()->addDays($validity)->toDateString(),
                'status' => 'active',
            ]);

            foreach ($sessions as $i => $s) {
                $service = $services->get($s['service_id']);
                $start = Carbon::parse($s['start_time'])->utc(); // la base guarda UTC, sin importar el desfase con que llegue
                $end = $start->copy()->addMinutes(max(5, (int) ($service?->duration_minutes ?? 50)));

                try {
                    $appointment = $this->appointments->store([
                        'client_id' => $client->id,
                        'employee_id' => $employeeId,
                        'service_id' => $s['service_id'],
                        'start_time' => $start->toDateTimeString(),
                        'end_time' => $end->toDateTimeString(),
                        'status' => 'confirmed',
                        'price_override' => $slices[$i],
                        'branch_id' => $branchId,
                        'source' => 'internal',
                        'internal_notes' => "Programa: {$program->name} (sesión " . ($i + 1) . " de {$total})",
                    ], $businessId, $userId ?? $employeeId);
                } catch (ValidationException $e) {
                    $msg = collect($e->errors())->flatten()->first() ?? 'horario no disponible';
                    throw new InvalidArgumentException('Sesión ' . ($i + 1) . " ({$start->format('d/m H:i')}): {$msg}");
                }

                EnrollmentSession::create([
                    'appointment_id' => $appointment->id,
                    'business_id' => $businessId,
                    'enrollment_id' => $enrollment->id,
                    'position' => $i + 1,
                    'consumes' => null,
                ]);
            }

            return $enrollment;
        });
    }

    /** Parte del precio de cada sesión; la última absorbe el redondeo para que sumen exactamente el precio. */
    public function priceSlices(float $price, int $count): array
    {
        $each = round($price / $count, 2);
        $slices = array_fill(0, $count, $each);
        $slices[$count - 1] = round($price - $each * ($count - 1), 2);

        return $slices;
    }

    /**
     * Las sesiones elegidas deben calzar con los componentes del programa: cada una de un servicio permitido
     * y la cantidad exacta por componente. Asigna primero a los componentes más restrictivos.
     */
    private function assertSessionsFitComponents(Program $program, array $sessions): void
    {
        $remaining = [];
        foreach ($program->components as $i => $c) {
            $remaining[$i] = (int) $c['quantity'];
        }
        $order = array_keys($remaining);
        usort($order, fn ($a, $b) => count($program->components[$a]['service_ids']) <=> count($program->components[$b]['service_ids']));

        foreach ($sessions as $s) {
            $placed = false;
            foreach ($order as $i) {
                if ($remaining[$i] > 0 && in_array($s['service_id'], $program->components[$i]['service_ids'], true)) {
                    $remaining[$i]--;
                    $placed = true;
                    break;
                }
            }
            if (!$placed) {
                throw new InvalidArgumentException('Los servicios elegidos no corresponden a lo que incluye el programa.');
            }
        }
    }

    // ── Lectura ─────────────────────────────────────────────────────────────────

    public function find(string $id, string $businessId): ?Enrollment
    {
        return Enrollment::where('id', $id)->where('business_id', $businessId)->first();
    }

    /** Inscripciones de un paciente, las más recientes primero. */
    public function forClient(string $clientId, string $businessId): array
    {
        $enrollments = Enrollment::where('business_id', $businessId)->where('client_id', $clientId)
            ->orderByDesc('created_at')->limit(50)->get();

        return $this->presentMany($enrollments);
    }

    public function show(Enrollment $enrollment): array
    {
        return $this->presentMany(collect([$enrollment]))[0];
    }

    /** Inscripción a la que pertenece una cita y qué número de sesión es; null si no es de ningún programa. */
    public function forAppointment(string $appointmentId, string $businessId): ?array
    {
        $row = DB::table('clinical_program_sessions')->where('appointment_id', $appointmentId)->where('business_id', $businessId)->first();
        $enrollment = $row ? $this->find($row->enrollment_id, $businessId) : null;
        if (!$enrollment) {
            return null;
        }

        $presented = $this->show($enrollment);
        $position = collect($presented['sessions'])->search(fn ($s) => $s['appointment_id'] === $appointmentId);

        return [
            'enrollment_id' => $presented['id'],
            'program_name' => $presented['program_name'],
            'status' => $presented['status'],
            'used' => $presented['used'],
            'sessions_total' => $presented['sessions_total'],
            'expires_on' => $presented['expires_on'],
            'position' => $position === false ? null : $position + 1,
            'is_paid' => $presented['is_paid'],
        ];
    }

    /**
     * @param Collection<int, Enrollment> $enrollments
     */
    private function presentMany(Collection $enrollments): array
    {
        if ($enrollments->isEmpty()) {
            return [];
        }

        $rows = DB::table('clinical_program_sessions as s')
            ->join('appointments as a', 'a.id', '=', 's.appointment_id')
            ->leftJoin('services as sv', 'sv.id', '=', 'a.service_id')
            ->leftJoin('profiles as p', 'p.id', '=', 'a.employee_id')
            ->whereIn('s.enrollment_id', $enrollments->pluck('id')->all())
            ->orderBy('a.start_time')
            ->get(['s.enrollment_id', 's.appointment_id', 's.consumes', 'a.start_time', 'a.status', 'a.payment_status',
                'a.service_id', 'sv.name as service_name', 'a.employee_id', 'p.full_name as employee_name'])
            ->groupBy('enrollment_id');

        return $enrollments->map(fn (Enrollment $e) => $this->present($e, $rows->get($e->id, collect())))->all();
    }

    private function present(Enrollment $e, Collection $rows): array
    {
        $sessions = $rows->values()->map(fn ($r, $i) => [
            'appointment_id' => $r->appointment_id,
            'number' => $i + 1,
            'start_time' => $r->start_time ? Carbon::parse($r->start_time, 'UTC')->toISOString() : null,
            'status' => $r->status,
            'payment_status' => $r->payment_status,
            'service_id' => $r->service_id,
            'service_name' => $r->service_name,
            'employee_id' => $r->employee_id,
            'employee_name' => $r->employee_name,
            'consumes' => $r->consumes === null ? null : (bool) $r->consumes,
            'counted' => $this->consumed($r),
        ])->all();

        $used = count(array_filter($sessions, fn ($s) => $s['counted']));
        $expires = $e->expires_on?->toDateString();

        return [
            'id' => $e->id,
            'client_id' => $e->client_id,
            'program_id' => $e->program_id,
            'program_name' => $e->program_name,
            'price' => $e->price,
            'sessions_total' => $e->sessions_total,
            'starts_on' => $e->starts_on?->toDateString(),
            'expires_on' => $expires,
            'status' => $this->effectiveStatus($e->status, $used, $e->sessions_total, $expires),
            'used' => $used,
            'remaining' => max(0, $e->sessions_total - $used),
            'is_paid' => $sessions !== [] && count(array_filter($sessions, fn ($s) => $s['payment_status'] === 'paid')) === count($sessions),
            'sessions' => $sessions,
        ];
    }

    /** ¿Esta sesión gasta una del programa? La decisión manual manda; si no, realizada o inasistencia. */
    private function consumed(object $row): bool
    {
        if ($row->consumes !== null) {
            return (bool) $row->consumes;
        }

        return in_array($row->status, ['completed', 'no_show'], true);
    }

    private function effectiveStatus(string $stored, int $used, int $total, ?string $expiresOn): string
    {
        if ($stored === 'cancelled') return 'cancelled';
        if ($used >= $total) return 'completed';
        if ($expiresOn !== null && $expiresOn < Carbon::today()->toDateString()) return 'expired';

        return 'active';
    }

    // ── Administración ──────────────────────────────────────────────────────────

    public function extend(Enrollment $enrollment, string $expiresOn): Enrollment
    {
        if ($enrollment->status === 'cancelled') {
            throw new InvalidArgumentException('La inscripción está cancelada.');
        }
        if ($expiresOn < $enrollment->starts_on->toDateString()) {
            throw new InvalidArgumentException('La fecha de vencimiento no puede ser anterior al inicio del programa.');
        }

        $enrollment->update(['expires_on' => $expiresOn]);

        return $enrollment->fresh();
    }

    /** Decisión manual sobre una sesión: true la gasta, false no, null vuelve al criterio automático. */
    public function setConsumes(Enrollment $enrollment, string $appointmentId, ?bool $consumes): void
    {
        $updated = EnrollmentSession::where('enrollment_id', $enrollment->id)->where('appointment_id', $appointmentId)->update(['consumes' => $consumes]);
        if (!$updated) {
            throw new InvalidArgumentException('Esa cita no es una sesión de este programa.');
        }
    }

    /**
     * Cancela la inscripción y borra sus citas, solo si todavía no se cobró ni se realizó ninguna sesión.
     * Un programa ya cobrado necesita una devolución, que se hace aparte.
     */
    public function cancel(Enrollment $enrollment): void
    {
        if ($enrollment->status === 'cancelled') {
            throw new InvalidArgumentException('La inscripción ya está cancelada.');
        }

        $ids = EnrollmentSession::where('enrollment_id', $enrollment->id)->pluck('appointment_id')->all();
        $blocked = Appointment::whereIn('id', $ids)->where(fn ($q) => $q->where('payment_status', 'paid')->orWhere('status', 'completed'))->exists();
        if ($blocked) {
            throw new InvalidArgumentException('No se puede cancelar: el programa ya se cobró o tiene sesiones realizadas.');
        }

        DB::transaction(function () use ($enrollment, $ids) {
            EnrollmentSession::where('enrollment_id', $enrollment->id)->delete();
            Appointment::whereIn('id', $ids)->delete();
            $enrollment->update(['status' => 'cancelled']);
        });
    }

    /** Una cita de programa no se elimina (se llevaría parte del cobro): se cancela. Llamado desde AppointmentService::destroy. */
    public static function assertAppointmentDeletable(string $appointmentId): void
    {
        if (!Schema::hasTable('clinical_program_sessions')) {
            return;
        }
        if (DB::table('clinical_program_sessions')->where('appointment_id', $appointmentId)->exists()) {
            throw ValidationException::withMessages([
                'id' => 'Esta cita es una sesión de un programa. Cancélala en vez de eliminarla, o cancela el programa completo desde el expediente del paciente.',
            ]);
        }
    }

    // ── POS ─────────────────────────────────────────────────────────────────────

    /**
     * Para el listado «pendientes de cobro» del POS: las citas sin pagar de cada inscripción salen
     * juntas como un solo cobro agrupado (mismo group_id, solo en la respuesta, no en la base) con
     * el nombre del programa y el conteo. Se incluyen TODAS sus citas sin pagar, también las canceladas,
     * para que el cobro sea siempre el precio completo del programa.
     */
    public function groupPendingForPos(Collection $appointments, string $businessId, ?string $branchId): Collection
    {
        if (!Schema::hasTable('clinical_program_sessions')) {
            return $appointments;
        }

        $enrollments = Enrollment::where('business_id', $businessId)->where('status', 'active')
            ->when($branchId, fn ($q) => $q->where(fn ($q) => $q->whereNull('branch_id')->orWhere('branch_id', $branchId)))
            ->get()->keyBy('id');
        if ($enrollments->isEmpty()) {
            return $appointments;
        }

        $sessions = DB::table('clinical_program_sessions as s')
            ->join('appointments as a', 'a.id', '=', 's.appointment_id')
            ->whereIn('s.enrollment_id', $enrollments->keys()->all())
            ->get(['s.enrollment_id', 's.appointment_id', 's.consumes', 'a.status', 'a.payment_status']);

        $unpaid = $sessions->filter(fn ($r) => $r->payment_status !== 'paid');
        if ($unpaid->isEmpty()) {
            return $appointments;
        }

        $enrollmentOf = $unpaid->pluck('enrollment_id', 'appointment_id');
        $usedBy = $sessions->groupBy('enrollment_id')->map(fn ($rows) => $rows->filter(fn ($r) => $this->consumed($r))->count());

        $relations = ['client', 'employeeProfile', 'assistantProfile', 'transactions', 'service.linkedProduct'];
        if (Schema::hasTable('service_products')) {
            $relations[] = 'service.linkedProducts.product';
        }
        $grouped = Appointment::with($relations)->whereIn('id', $enrollmentOf->keys()->all())->get();
        foreach ($grouped as $a) {
            $enrollmentId = $enrollmentOf[$a->id];
            $e = $enrollments[$enrollmentId];
            $a->setAttribute('group_id', $enrollmentId);
            $a->setAttribute('program', [
                'enrollment_id' => $enrollmentId,
                'name' => $e->program_name,
                'used' => (int) ($usedBy[$enrollmentId] ?? 0),
                'total' => $e->sessions_total,
            ]);
        }

        return $appointments
            ->reject(fn ($a) => $enrollmentOf->has($a->id))
            ->concat($grouped)
            ->sortBy('start_time')
            ->values();
    }
}
