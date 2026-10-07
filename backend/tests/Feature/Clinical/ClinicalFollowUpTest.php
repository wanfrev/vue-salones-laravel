<?php

namespace Tests\Feature\Clinical;

use App\Http\Controllers\Api\Clinical\FollowUpController;
use App\Services\Clinical\FollowUpService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ClinicalFollowUpTest extends TestCase
{
    use BuildsClinicalSchema;

    private const BIZ = 'biz-1';
    private CarbonImmutable $now;

    protected function setUp(): void
    {
        parent::setUp();
        $this->buildClinicalSchema();
        $this->now = CarbonImmutable::parse('2026-10-05 12:00:00');

        foreach (['ana' => 'Ana Pérez', 'beto' => 'Beto Ruiz', 'carla' => 'Carla Soto', 'dani' => 'Dani Lara'] as $id => $name) {
            DB::table('clients')->insert(['id' => $id, 'business_id' => self::BIZ, 'full_name' => $name, 'phone' => '0414-' . $id]);
        }
        DB::table('clients')->insert(['id' => 'ajeno', 'business_id' => 'biz-2', 'full_name' => 'Paciente de otro negocio']);
        DB::table('services')->insert(['id' => 'sv', 'name' => 'Psicoterapia individual']);
    }

    private function appt(string $client, string $when, string $status = 'completed', ?string $employee = 'emp-1', string $biz = self::BIZ): string
    {
        $id = (string) Str::uuid();
        DB::table('appointments')->insert([
            'id' => $id, 'business_id' => $biz, 'client_id' => $client, 'employee_id' => $employee,
            'service_id' => 'sv', 'start_time' => $when, 'status' => $status,
        ]);

        return $id;
    }

    private function note(string $client, int $number, string $risk, string $date, ?string $appointmentId = null): void
    {
        DB::table('clinical_session_notes')->insert([
            'id' => (string) Str::uuid(), 'business_id' => self::BIZ, 'client_id' => $client, 'appointment_id' => $appointmentId,
            'session_number' => $number, 'session_date' => $date, 'risk_level' => $risk,
            'content' => 'cifrado', 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function svc(): FollowUpService
    {
        return new FollowUpService();
    }

    // ── Notas pendientes ────────────────────────────────────────────────────────

    public function test_attended_sessions_without_a_note_are_pending_and_noted_ones_are_not(): void
    {
        $withoutNote = $this->appt('ana', '2026-10-02 10:00:00');
        $withNote = $this->appt('beto', '2026-10-01 10:00:00');
        $this->note('beto', 1, 'none', '2026-10-01', $withNote);

        $pending = $this->svc()->notesPending(self::BIZ, null, $this->now);

        $this->assertCount(1, $pending);
        $this->assertSame($withoutNote, $pending[0]['appointment_id']);
        $this->assertSame('Ana Pérez', $pending[0]['client_name']);
        $this->assertSame('Psicoterapia individual', $pending[0]['service_name']);
    }

    public function test_only_attended_recent_past_sessions_count_as_pending(): void
    {
        $this->appt('ana', '2026-10-02 10:00:00', 'cancelled');
        $this->appt('ana', '2026-10-03 10:00:00', 'no_show');
        $this->appt('ana', '2026-10-04 10:00:00', 'confirmed');
        $this->appt('ana', '2026-08-01 10:00:00', 'completed');   // más de 30 días
        $this->appt('ana', '2026-10-09 10:00:00', 'completed');   // en el futuro
        $this->appt('ajeno', '2026-10-02 10:00:00', 'completed', 'emp-1', 'biz-2'); // otro negocio

        $this->assertSame([], $this->svc()->notesPending(self::BIZ, null, $this->now));
    }

    public function test_a_professional_only_sees_their_own_pending_notes(): void
    {
        $mine = $this->appt('ana', '2026-10-02 10:00:00', 'completed', 'emp-1');
        $this->appt('beto', '2026-10-02 11:00:00', 'completed', 'emp-2');

        $ids = fn (?string $emp) => array_column($this->svc()->notesPending(self::BIZ, $emp, $this->now), 'appointment_id');

        $this->assertSame([$mine], $ids('emp-1'));
        $this->assertCount(2, $ids(null)); // el admin ve todo
    }

    // ── Riesgo sin seguimiento ──────────────────────────────────────────────────

    public function test_only_the_latest_note_decides_and_a_future_appointment_clears_the_alert(): void
    {
        // Ana: riesgo alto antes, pero la última nota ya bajó → no aparece.
        $this->note('ana', 1, 'high', '2026-09-01');
        $this->note('ana', 2, 'low', '2026-09-20');
        // Beto: última nota con riesgo alto y sin próxima cita → aparece.
        $this->note('beto', 1, 'none', '2026-09-01');
        $this->note('beto', 2, 'high', '2026-09-25');
        // Carla: riesgo moderado pero ya tiene próxima cita agendada → no aparece.
        $this->note('carla', 1, 'moderate', '2026-09-28');
        $this->appt('carla', '2026-10-08 10:00:00', 'confirmed');
        // Dani: riesgo moderado con cita futura CANCELADA → sí aparece (nadie la espera).
        $this->note('dani', 1, 'moderate', '2026-10-01');
        $this->appt('dani', '2026-10-08 10:00:00', 'cancelled');

        $out = $this->svc()->riskUnfollowed(self::BIZ, $this->now);

        $this->assertSame(['beto', 'dani'], array_column($out, 'client_id'));
        $this->assertSame('high', $out[0]['risk_level']);
        $this->assertSame(10, $out[0]['days_since']); // 25 sep → 5 oct
        $this->assertSame(2, $out[0]['session_number']);
    }

    public function test_high_risk_is_listed_before_moderate_and_longer_waits_first_within_a_level(): void
    {
        $this->note('ana', 1, 'moderate', '2026-08-01');   // moderada, la más antigua
        $this->note('beto', 1, 'moderate', '2026-09-30');
        $this->note('carla', 1, 'high', '2026-10-04');     // alta pero reciente: aun así va primero

        $this->assertSame(['carla', 'ana', 'beto'], array_column($this->svc()->riskUnfollowed(self::BIZ, $this->now), 'client_id'));
    }

    public function test_risk_list_never_leaks_another_business(): void
    {
        DB::table('clinical_session_notes')->insert([
            'id' => (string) Str::uuid(), 'business_id' => 'biz-2', 'client_id' => 'ajeno',
            'session_number' => 1, 'session_date' => '2026-09-01', 'risk_level' => 'high',
            'content' => 'x', 'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->assertSame([], $this->svc()->riskUnfollowed(self::BIZ, $this->now));
    }

    // ── Posible abandono ────────────────────────────────────────────────────────

    public function test_inactive_patients_are_those_who_attended_but_not_within_the_window_and_have_nothing_scheduled(): void
    {
        $this->appt('ana', '2026-08-10 10:00:00');   // última hace ~8 semanas → inactiva
        $this->appt('ana', '2026-07-10 10:00:00');
        $this->appt('beto', '2026-09-28 10:00:00');  // vino hace una semana → activo
        $this->appt('carla', '2026-08-01 10:00:00'); // inactiva en el papel…
        $this->appt('carla', '2026-10-10 10:00:00', 'confirmed'); // …pero ya tiene próxima cita
        $this->appt('dani', '2026-08-01 10:00:00', 'no_show'); // nunca asistió: no es "abandono"

        $out = $this->svc()->inactive(self::BIZ, 4, $this->now);

        $this->assertSame(['ana'], array_column($out, 'client_id'));
        $this->assertSame('2026-08-10', $out[0]['last_session']);
        $this->assertSame(56, $out[0]['days_since']);
        $this->assertSame(2, $out[0]['sessions']);
        $this->assertSame('0414-ana', $out[0]['phone']);
    }

    public function test_the_weeks_window_changes_who_counts_as_inactive(): void
    {
        $this->appt('beto', '2026-09-10 10:00:00'); // hace ~3.7 semanas

        $this->assertSame([], $this->svc()->inactive(self::BIZ, 4, $this->now));
        $this->assertSame(['beto'], array_column($this->svc()->inactive(self::BIZ, 2, $this->now), 'client_id'));
    }

    public function test_most_overdue_patients_come_first(): void
    {
        $this->appt('ana', '2026-08-20 10:00:00');
        $this->appt('beto', '2026-07-01 10:00:00');

        $this->assertSame(['beto', 'ana'], array_column($this->svc()->inactive(self::BIZ, 4, $this->now), 'client_id'));
    }

    public function test_every_list_is_bounded(): void
    {
        for ($i = 0; $i < FollowUpService::LIMIT + 20; $i++) {
            DB::table('clients')->insert(['id' => "bulk-{$i}", 'business_id' => self::BIZ, 'full_name' => "Bulk {$i}"]);
            $this->appt("bulk-{$i}", '2026-07-01 10:00:00');
        }

        $this->assertCount(FollowUpService::LIMIT, $this->svc()->inactive(self::BIZ, 4, $this->now));
    }

    // ── Controller ──────────────────────────────────────────────────────────────

    private function follow(string $role, array $query = [], string $userId = 'emp-1', bool $flag = true)
    {
        $request = Request::create('/api/clinical/follow-up', 'GET', $query);
        $request->setUserResolver(fn () => (object) [
            'id' => $userId,
            'profile' => (object) ['id' => $userId, 'role' => $role, 'business_id' => self::BIZ, 'can_access_dental_clinical' => $flag],
        ]);

        return app(FollowUpController::class)->index($request);
    }

    public function test_controller_enforces_the_clinical_permission_and_returns_the_three_lists(): void
    {
        $this->assertSame(403, $this->follow('cajero')->getStatusCode());
        $this->assertSame(403, $this->follow('empleado', [], 'emp-1', false)->getStatusCode());

        $body = json_decode($this->follow('admin')->getContent(), true);
        $this->assertSame(['weeks', 'notes_pending', 'risk_unfollowed', 'risk_cases', 'inactive'], array_keys($body));
        $this->assertSame(4, $body['weeks']);
    }

    public function test_controller_scopes_pending_notes_by_role_and_validates_weeks(): void
    {
        $this->appt('ana', now()->subDays(2)->toDateTimeString(), 'completed', 'emp-1');
        $this->appt('beto', now()->subDays(2)->toDateTimeString(), 'completed', 'emp-2');

        $this->assertCount(1, json_decode($this->follow('empleado', [], 'emp-1')->getContent(), true)['notes_pending']);
        $this->assertCount(2, json_decode($this->follow('admin', [], 'boss')->getContent(), true)['notes_pending']);

        $this->assertSame(8, json_decode($this->follow('admin', ['weeks' => 8])->getContent(), true)['weeks']);
        foreach ([0, 27, 'abc'] as $bad) {
            try {
                $this->follow('admin', ['weeks' => $bad]);
                $this->fail("weeks={$bad} debió fallar");
            } catch (ValidationException $e) {
                $this->assertArrayHasKey('weeks', $e->errors());
            }
        }
    }
}
