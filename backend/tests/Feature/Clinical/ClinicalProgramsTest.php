<?php

namespace Tests\Feature\Clinical;

use App\Http\Controllers\Api\Clinical\ProgramController;
use App\Models\Appointment;
use App\Models\Client;
use App\Models\Clinical\Enrollment;
use App\Models\Clinical\Program;
use App\Services\AppointmentService;
use App\Services\Clinical\EnrollmentService;
use App\Services\Clinical\ProgramService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use Tests\TestCase;

class ClinicalProgramsTest extends TestCase
{
    use BuildsClinicalSchema;

    private const BIZ = 'biz-1';

    private string $ana = '10000000-0000-4000-8000-000000000001';
    private string $ajena = '10000000-0000-4000-8000-0000000000aa';
    private string $doc = '20000000-0000-4000-8000-000000000001';
    private string $lenguaje = '30000000-0000-4000-8000-000000000001';
    private string $aba = '30000000-0000-4000-8000-000000000002';
    private string $psico = '30000000-0000-4000-8000-000000000003';
    private string $asesoria = '30000000-0000-4000-8000-000000000004';
    private string $ajeno = '30000000-0000-4000-8000-0000000000aa';

    protected function setUp(): void
    {
        parent::setUp();
        $this->buildClinicalSchema();
        Carbon::setTestNow(Carbon::parse('2026-10-08 12:00:00', 'UTC'));

        DB::table('clients')->insert([
            ['id' => $this->ana, 'business_id' => self::BIZ, 'full_name' => 'Ana Pérez', 'phone' => '0414-1'],
            ['id' => $this->ajena, 'business_id' => 'biz-2', 'full_name' => 'Otra', 'phone' => '0414-2'],
        ]);
        DB::table('profiles')->insert(['id' => $this->doc, 'business_id' => self::BIZ, 'full_name' => 'Dra. Soto', 'role' => 'empleado']);
        foreach ([[$this->lenguaje, 'Terapia de lenguaje', 50], [$this->aba, 'Terapia ABA', 50], [$this->psico, 'Psicopedagogía', 50], [$this->asesoria, 'Asesoría para padres', 60]] as [$id, $name, $min]) {
            DB::table('services')->insert(['id' => $id, 'business_id' => self::BIZ, 'name' => $name, 'duration_minutes' => $min, 'price' => 0]);
        }
        DB::table('services')->insert(['id' => $this->ajeno, 'business_id' => 'biz-2', 'name' => 'De otro negocio', 'duration_minutes' => 50, 'price' => 0]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    // ── Ayudantes ───────────────────────────────────────────────────────────────

    private function programs(): ProgramService
    {
        return new ProgramService();
    }

    private function enrollments(): EnrollmentService
    {
        return new EnrollmentService(new AppointmentService());
    }

    /** Programa de N sesiones de un solo servicio (como «Terapias de lenguaje»: 8 al mes, $120). */
    private function simpleProgram(int $sessions = 8, float $price = 120.0, int $validity = 30): Program
    {
        return $this->programs()->create(self::BIZ, null, [
            'name' => 'Terapias de lenguaje', 'price' => $price, 'validity_days' => $validity,
            'components' => [['service_ids' => [$this->lenguaje], 'quantity' => $sessions]],
        ]);
    }

    /** @return array<int, array{service_id: string, start_time: string}> N sesiones, una por día a las 15:00 UTC desde el 12 de octubre. */
    private function schedule(int $count, ?string $serviceId = null, int $everyDays = 1, int $offsetDays = 0): array
    {
        $out = [];
        for ($i = 0; $i < $count; $i++) {
            $out[] = ['service_id' => $serviceId ?? $this->lenguaje, 'start_time' => Carbon::parse('2026-10-12 15:00:00', 'UTC')->addDays($offsetDays + $i * $everyDays)->toIso8601String()];
        }

        return $out;
    }

    private function enrollAna(Program $program, ?array $sessions = null): Enrollment
    {
        return $this->enrollments()->enroll(
            self::BIZ, Client::find($this->ana), $program, $this->doc,
            $sessions ?? $this->schedule($program->sessionsTotal()), null, 'u1',
        );
    }

    private function appointmentIds(Enrollment $e): array
    {
        return DB::table('clinical_program_sessions')->where('enrollment_id', $e->id)->pluck('appointment_id')->all();
    }

    private function setApptStatus(string $appointmentId, string $status): void
    {
        DB::table('appointments')->where('id', $appointmentId)->update(['status' => $status]);
    }

    private function asArray(JsonResponse $r): mixed
    {
        return json_decode($r->getContent(), true);
    }

    private function req(string $role = 'admin', string $method = 'GET', array $body = [], array $query = []): Request
    {
        $request = Request::create('/api/x', $method, $query, [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'], json_encode($body));
        $request->setUserResolver(fn () => (object) [
            'id' => 'u1',
            'profile' => (object) ['id' => 'u1', 'role' => $role, 'business_id' => self::BIZ, 'can_access_dental_clinical' => false],
        ]);

        return $request;
    }

    // ── Catálogo ────────────────────────────────────────────────────────────────

    public function test_a_program_adds_up_its_sessions_and_lists_its_services(): void
    {
        $mixto = $this->programs()->create(self::BIZ, null, [
            'name' => 'Programa mixto', 'price' => 180,
            'components' => [
                ['service_ids' => [$this->lenguaje, $this->psico, $this->aba], 'quantity' => 12],
                ['service_ids' => [$this->asesoria], 'quantity' => 1],
            ],
        ]);

        $listed = $this->programs()->list(self::BIZ)[0];
        $this->assertSame(13, $mixto->sessionsTotal());
        $this->assertSame(13, $listed['sessions_total']);
        $this->assertSame(30, $listed['validity_days']);
        $this->assertSame(['Terapia de lenguaje', 'Psicopedagogía', 'Terapia ABA'], array_column($listed['components'][0]['services'], 'name'));
    }

    public function test_a_program_cannot_use_services_of_another_business_or_exceed_the_limits(): void
    {
        $bad = fn (array $components) => fn () => $this->programs()->create(self::BIZ, null, ['name' => 'X', 'price' => 10, 'components' => $components]);

        foreach ([
            'servicio ajeno' => [['service_ids' => [$this->ajeno], 'quantity' => 1]],
            'sin servicios' => [['service_ids' => [], 'quantity' => 1]],
            'cantidad cero' => [['service_ids' => [$this->lenguaje], 'quantity' => 0]],
            'demasiadas sesiones' => [['service_ids' => [$this->lenguaje], 'quantity' => 61]],
            'sin componentes' => [],
        ] as $why => $components) {
            try {
                $bad($components)();
                $this->fail("Debió rechazar: {$why}");
            } catch (InvalidArgumentException) {
                $this->addToAssertionCount(1);
            }
        }
    }

    public function test_editing_the_catalog_does_not_change_what_was_already_sold(): void
    {
        $program = $this->simpleProgram();
        $enrollment = $this->enrollAna($program);

        $this->programs()->update($program, ['name' => 'Renombrado', 'price' => 999]);

        $shown = $this->enrollments()->show($enrollment->fresh());
        $this->assertSame('Terapias de lenguaje', $shown['program_name']);
        $this->assertEquals(120, $shown['price']);
    }

    // ── Inscribir: las citas se crean de una vez ────────────────────────────────

    public function test_enrolling_creates_every_appointment_as_a_normal_editable_appointment(): void
    {
        $e = $this->enrollAna($this->simpleProgram());

        $appointments = Appointment::whereIn('id', $this->appointmentIds($e))->orderBy('start_time')->get();
        $this->assertCount(8, $appointments);
        $this->assertSame(['confirmed'], $appointments->pluck('status')->unique()->all());
        $this->assertSame([$this->doc], $appointments->pluck('employee_id')->unique()->all());
        $this->assertSame([$this->ana], $appointments->pluck('client_id')->unique()->all());
        // La duración sale del servicio (50 min).
        $this->assertEquals(50, $appointments[0]->start_time->diffInMinutes($appointments[0]->end_time));
        $this->assertSame('2026-10-12', $e->starts_on->toDateString());
        $this->assertSame('2026-11-11', $e->expires_on->toDateString());
    }

    public function test_each_appointment_carries_its_slice_and_the_slices_add_up_to_the_program_price_exactly(): void
    {
        foreach ([[8, 120.0], [13, 180.0], [3, 100.0], [7, 0.1]] as [$n, $price]) {
            $slices = $this->enrollments()->priceSlices($price, $n);
            $this->assertCount($n, $slices);
            $this->assertEqualsWithDelta($price, array_sum($slices), 0.0001, "{$n} sesiones de {$price}");
        }

        $e = $this->enrollAna($this->simpleProgram(3, 100.0));
        $sum = (float) DB::table('appointments')->whereIn('id', $this->appointmentIds($e))->sum('price_override');
        $this->assertEqualsWithDelta(100.0, $sum, 0.001);
    }

    public function test_the_mixed_program_lets_each_appointment_pick_a_service_within_its_component(): void
    {
        $mixto = $this->programs()->create(self::BIZ, null, [
            'name' => 'Programa mixto', 'price' => 180,
            'components' => [
                ['service_ids' => [$this->lenguaje, $this->psico, $this->aba], 'quantity' => 12],
                ['service_ids' => [$this->asesoria], 'quantity' => 1],
            ],
        ]);

        $sessions = $this->schedule(13);
        $sessions[3]['service_id'] = $this->aba;
        $sessions[4]['service_id'] = $this->psico;
        $sessions[12]['service_id'] = $this->asesoria;

        $e = $this->enrollAna($mixto, $sessions);
        $services = DB::table('appointments')->whereIn('id', $this->appointmentIds($e))->pluck('service_id')->countBy()->all();

        $this->assertSame([10, 1, 1, 1], [$services[$this->lenguaje], $services[$this->psico], $services[$this->aba], $services[$this->asesoria]]);
    }

    public function test_the_chosen_services_must_match_what_the_program_includes(): void
    {
        $mixto = $this->programs()->create(self::BIZ, null, [
            'name' => 'Programa mixto', 'price' => 180,
            'components' => [
                ['service_ids' => [$this->lenguaje, $this->aba], 'quantity' => 2],
                ['service_ids' => [$this->asesoria], 'quantity' => 1],
            ],
        ]);

        $allowed = $this->schedule(3);
        $allowed[2]['service_id'] = $this->asesoria;
        $this->assertSame(3, $this->enrollAna($mixto, $allowed)->sessions_total);

        foreach ([
            'dos asesorías' => [$this->lenguaje, $this->asesoria, $this->asesoria],
            'un servicio que no incluye' => [$this->lenguaje, $this->psico, $this->asesoria],
            'sin la asesoría' => [$this->lenguaje, $this->aba, $this->lenguaje],
        ] as $why => $ids) {
            $sessions = $this->schedule(3);
            foreach ($ids as $i => $id) {
                $sessions[$i]['service_id'] = $id;
            }
            try {
                $this->enrollAna($mixto, $sessions);
                $this->fail("Debió rechazar: {$why}");
            } catch (InvalidArgumentException) {
                $this->addToAssertionCount(1);
            }
        }
    }

    public function test_enrolling_needs_exactly_the_programs_sessions_and_they_must_fit_the_validity(): void
    {
        $program = $this->simpleProgram(8);

        $this->expectExceptionObject(new InvalidArgumentException('El programa tiene 8 sesiones; se enviaron 7.'));
        $this->enrollAna($program, $this->schedule(7));
    }

    public function test_sessions_outside_the_validity_window_are_refused(): void
    {
        $program = $this->simpleProgram(4, 60.0, 30);

        // Una cada 10 días: la última cae a los 30 días justos (entra); cada 11, a los 33 (no).
        $this->assertSame(4, $this->enrollAna($program, $this->schedule(4, null, 10))->sessions_total);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('dentro de los 30 días de vigencia');
        $this->enrollAna($program, $this->schedule(4, null, 11));
    }

    public function test_a_clash_with_another_appointment_cancels_the_whole_enrollment(): void
    {
        $program = $this->simpleProgram(4, 60.0);
        $sessions = $this->schedule(4);
        // La doctora ya tiene una cita el mismo día que la sesión 3.
        DB::table('appointments')->insert([
            'id' => '40000000-0000-4000-8000-000000000001', 'business_id' => self::BIZ, 'client_id' => $this->ajena,
            'employee_id' => $this->doc, 'service_id' => $this->lenguaje, 'status' => 'confirmed',
            'start_time' => '2026-10-14 15:10:00', 'end_time' => '2026-10-14 16:00:00',
        ]);

        try {
            $this->enrollAna($program, $sessions);
            $this->fail('Debió rechazar el choque de horario');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('Sesión 3', $e->getMessage());
        }

        $this->assertSame(1, Appointment::count(), 'no debe quedar ninguna cita a medias');
        $this->assertSame(0, Enrollment::count());
        $this->assertSame(0, DB::table('clinical_program_sessions')->count());
    }

    public function test_an_inactive_program_and_a_professional_of_another_business_are_refused(): void
    {
        $program = $this->simpleProgram(2, 30.0);
        $this->programs()->update($program, ['active' => false]);

        try {
            $this->enrollAna($program->fresh());
            $this->fail('Programa desactivado');
        } catch (InvalidArgumentException) {
            $this->addToAssertionCount(1);
        }

        $this->programs()->update($program, ['active' => true]);
        $this->expectException(InvalidArgumentException::class);
        $this->enrollments()->enroll(self::BIZ, Client::find($this->ana), $program->fresh(), '20000000-0000-4000-8000-0000000000ff', $this->schedule(2), null, 'u1');
    }

    // ── Conteo ──────────────────────────────────────────────────────────────────

    public function test_completed_and_no_show_sessions_are_used_but_cancelled_ones_are_not(): void
    {
        $e = $this->enrollAna($this->simpleProgram());
        $ids = $this->appointmentIds($e);

        $this->assertSame(0, $this->enrollments()->show($e)['used']);

        $this->setApptStatus($ids[0], 'completed');
        $this->setApptStatus($ids[1], 'no_show');
        $this->setApptStatus($ids[2], 'cancelled');

        $shown = $this->enrollments()->show($e);
        $this->assertSame(2, $shown['used']);
        $this->assertSame(6, $shown['remaining']);
        $this->assertSame('active', $shown['status']);
        $this->assertSame([true, true, false], array_column(array_slice($shown['sessions'], 0, 3), 'counted'));
    }

    public function test_the_administrator_can_override_whether_a_session_counts(): void
    {
        $e = $this->enrollAna($this->simpleProgram());
        $ids = $this->appointmentIds($e);
        $this->setApptStatus($ids[0], 'no_show'); // por defecto gasta

        $this->enrollments()->setConsumes($e, $ids[0], false);   // el administrador decide que no
        $this->enrollments()->setConsumes($e, $ids[1], true);    // y que una cancelada con cobro sí
        $this->setApptStatus($ids[1], 'cancelled');

        $this->assertSame(1, $this->enrollments()->show($e)['used']);

        $this->enrollments()->setConsumes($e, $ids[0], null);    // vuelve al criterio automático
        $this->assertSame(2, $this->enrollments()->show($e)['used']);
    }

    public function test_overriding_a_session_of_another_program_is_refused(): void
    {
        $e = $this->enrollAna($this->simpleProgram(2, 30.0));

        $this->expectException(InvalidArgumentException::class);
        $this->enrollments()->setConsumes($e, '99999999-0000-4000-8000-000000000000', true);
    }

    public function test_status_is_deduced_completed_when_all_are_used_and_expired_after_the_date_with_sessions_left(): void
    {
        $e = $this->enrollAna($this->simpleProgram(2, 30.0));
        foreach ($this->appointmentIds($e) as $id) {
            $this->setApptStatus($id, 'completed');
        }
        $this->assertSame('completed', $this->enrollments()->show($e)['status']);

        $e2 = $this->enrollAna($this->simpleProgram(2, 30.0), [
            ['service_id' => $this->lenguaje, 'start_time' => '2026-10-20T15:00:00Z'],
            ['service_id' => $this->lenguaje, 'start_time' => '2026-10-21T15:00:00Z'],
        ]);
        $this->assertSame('active', $this->enrollments()->show($e2)['status']);

        Carbon::setTestNow(Carbon::parse('2026-11-25 12:00:00', 'UTC')); // pasó la vigencia (19 nov)
        $this->assertSame('expired', $this->enrollments()->show($e2)['status']);
    }

    public function test_extending_gives_the_unused_sessions_a_second_life_and_cannot_precede_the_start(): void
    {
        $e = $this->enrollAna($this->simpleProgram(2, 30.0), [
            ['service_id' => $this->lenguaje, 'start_time' => '2026-10-20T15:00:00Z'],
            ['service_id' => $this->lenguaje, 'start_time' => '2026-10-21T15:00:00Z'],
        ]);
        Carbon::setTestNow(Carbon::parse('2026-11-25 12:00:00', 'UTC'));
        $this->assertSame('expired', $this->enrollments()->show($e)['status']);

        $e = $this->enrollments()->extend($e, '2026-12-15');
        $this->assertSame('active', $this->enrollments()->show($e)['status']);

        $this->expectException(InvalidArgumentException::class);
        $this->enrollments()->extend($e, '2026-10-01');
    }

    public function test_it_is_paid_only_when_every_session_is_paid(): void
    {
        $e = $this->enrollAna($this->simpleProgram(3, 60.0));
        $ids = $this->appointmentIds($e);
        $this->assertFalse($this->enrollments()->show($e)['is_paid']);

        DB::table('appointments')->whereIn('id', array_slice($ids, 0, 2))->update(['payment_status' => 'paid']);
        $this->assertFalse($this->enrollments()->show($e)['is_paid']);

        DB::table('appointments')->where('id', $ids[2])->update(['payment_status' => 'paid']);
        $this->assertTrue($this->enrollments()->show($e)['is_paid']);
    }

    public function test_an_appointment_knows_its_program_and_its_session_number_in_time_order(): void
    {
        $e = $this->enrollAna($this->simpleProgram(3, 60.0));
        $ids = $this->appointmentIds($e);
        // Se reprograma la primera cita al final: el número sigue el orden en el tiempo.
        DB::table('appointments')->where('id', $ids[0])->update(['start_time' => '2026-10-30 15:00:00']);

        $info = $this->enrollments()->forAppointment($ids[0], self::BIZ);
        $this->assertSame(3, $info['position']);
        $this->assertSame(3, $info['sessions_total']);
        $this->assertSame('Terapias de lenguaje', $info['program_name']);

        $this->assertNull($this->enrollments()->forAppointment('99999999-0000-4000-8000-000000000000', self::BIZ));
        $this->assertNull($this->enrollments()->forAppointment($ids[0], 'biz-2'));
    }

    // ── Cancelar y borrar ───────────────────────────────────────────────────────

    public function test_cancelling_an_unpaid_untouched_enrollment_removes_its_appointments(): void
    {
        $e = $this->enrollAna($this->simpleProgram(3, 60.0));

        $this->enrollments()->cancel($e);

        $this->assertSame(0, Appointment::count());
        $this->assertSame('cancelled', $this->enrollments()->show($e->fresh())['status']);
    }

    public function test_cancelling_is_refused_once_paid_or_when_a_session_was_held(): void
    {
        $paid = $this->enrollAna($this->simpleProgram(2, 30.0));
        DB::table('appointments')->where('id', $this->appointmentIds($paid)[0])->update(['payment_status' => 'paid']);

        $held = $this->enrollAna($this->simpleProgram(2, 30.0), $this->schedule(2, null, 3, 5)); // otros días: la doctora no se solapa
        $this->setApptStatus($this->appointmentIds($held)[0], 'completed');

        foreach ([$paid, $held] as $enrollment) {
            try {
                $this->enrollments()->cancel($enrollment);
                $this->fail('No debe poder cancelarse');
            } catch (InvalidArgumentException) {
                $this->addToAssertionCount(1);
            }
        }
        $this->assertSame(4, Appointment::count());
    }

    public function test_an_appointment_of_a_program_cannot_be_deleted_but_an_ordinary_one_can(): void
    {
        $e = $this->enrollAna($this->simpleProgram(2, 30.0));
        $ordinary = '50000000-0000-4000-8000-000000000001';
        DB::table('appointments')->insert(['id' => $ordinary, 'business_id' => self::BIZ, 'client_id' => $this->ana, 'employee_id' => $this->doc, 'status' => 'confirmed']);

        $service = new AppointmentService();
        try {
            $service->destroy($this->appointmentIds($e)[0], self::BIZ);
            $this->fail('Debió negarse a eliminar una sesión de programa');
        } catch (ValidationException $ex) {
            $this->assertStringContainsString('programa', $ex->errors()['id'][0]);
        }
        $this->assertSame(3, Appointment::count());

        $service->destroy($ordinary, self::BIZ); // las demás citas siguen borrándose igual
        $this->assertSame(2, Appointment::count());
    }

    // ── POS: un solo cobro por programa ─────────────────────────────────────────

    public function test_the_pos_lists_a_programs_unpaid_appointments_as_one_group_with_the_count(): void
    {
        $e = $this->enrollAna($this->simpleProgram(4, 60.0));
        $ids = $this->appointmentIds($e);
        $this->setApptStatus($ids[0], 'completed');
        $this->setApptStatus($ids[1], 'cancelled'); // sale también: el cobro siempre es el precio completo
        $ordinary = '50000000-0000-4000-8000-000000000001';
        DB::table('appointments')->insert(['id' => $ordinary, 'business_id' => self::BIZ, 'client_id' => $this->ana, 'employee_id' => $this->doc, 'status' => 'confirmed', 'start_time' => '2026-10-09 10:00:00']);

        $base = Appointment::whereIn('id', [...array_slice($ids, 0, 1), $ordinary])->get(); // lo que el POS ya trae por sí solo
        $out = $this->enrollments()->groupPendingForPos($base, self::BIZ, null);

        $grouped = $out->where('group_id', $e->id);
        $this->assertCount(4, $grouped, 'las 4 citas del programa, incluida la cancelada');
        $this->assertSame([1, 4, 'Terapias de lenguaje'], [$grouped->first()->program['used'], $grouped->first()->program['total'], $grouped->first()->program['name']]);
        $this->assertEqualsWithDelta(60.0, $grouped->sum('price_override'), 0.001, 'el cobro del grupo es el precio del programa');

        $this->assertNull($out->firstWhere('id', $ordinary)->group_id, 'una cita común no se agrupa');
        $this->assertCount(5, $out);
        $this->assertSame(1, $out->where('id', $ids[0])->count(), 'la cita del programa no sale duplicada');
        $this->assertNull(DB::table('appointments')->where('id', $ids[0])->value('group_id'), 'el group_id es solo de la respuesta, no se guarda');
    }

    public function test_paid_programs_and_businesses_without_enrollments_leave_the_pos_list_untouched(): void
    {
        $ordinary = '50000000-0000-4000-8000-000000000001';
        DB::table('appointments')->insert(['id' => $ordinary, 'business_id' => self::BIZ, 'client_id' => $this->ana, 'employee_id' => $this->doc, 'status' => 'confirmed']);
        $base = Appointment::all();
        $this->assertSame($base->pluck('id')->all(), $this->enrollments()->groupPendingForPos($base, self::BIZ, null)->pluck('id')->all());

        $e = $this->enrollAna($this->simpleProgram(2, 30.0));
        DB::table('appointments')->whereIn('id', $this->appointmentIds($e))->update(['payment_status' => 'paid']);
        $out = $this->enrollments()->groupPendingForPos(Appointment::where('id', $ordinary)->get(), self::BIZ, null);
        $this->assertSame([$ordinary], $out->pluck('id')->all());
    }

    // ── Controller ──────────────────────────────────────────────────────────────

    public function test_only_administration_changes_the_catalog_but_reception_can_read_and_enroll(): void
    {
        $c = app(ProgramController::class);
        $payload = ['name' => 'Nuevo', 'price' => 50, 'components' => [['service_ids' => [$this->lenguaje], 'quantity' => 4]]];

        $this->assertSame(403, $c->store($this->req('cajero', 'POST', $payload))->getStatusCode());
        $this->assertSame(403, $c->store($this->req('empleado', 'POST', $payload))->getStatusCode());
        $this->assertSame(201, $c->store($this->req('admin', 'POST', $payload))->getStatusCode());

        $this->assertSame(200, $c->index($this->req('cajero'))->getStatusCode());
        $this->assertCount(1, $this->asArray($c->index($this->req('cajero'))));

        $program = Program::first();
        $enroll = ['program_id' => $program->id, 'employee_id' => $this->doc, 'sessions' => $this->schedule(4)];
        $this->assertSame(201, $c->enroll($this->req('cajero', 'POST', $enroll), $this->ana)->getStatusCode());
    }

    public function test_extending_cancelling_and_overriding_are_administration_only(): void
    {
        $c = app(ProgramController::class);
        $e = $this->enrollAna($this->simpleProgram(2, 30.0));
        $appt = $this->appointmentIds($e)[0];

        foreach (['cajero', 'empleado'] as $role) {
            $this->assertSame(403, $c->updateEnrollment($this->req($role, 'PUT', ['expires_on' => '2026-12-01']), $e->id)->getStatusCode());
            $this->assertSame(403, $c->cancelEnrollment($this->req($role, 'DELETE'), $e->id)->getStatusCode());
            $this->assertSame(403, $c->setSessionConsumes($this->req($role, 'PUT', ['consumes' => true]), $e->id, $appt)->getStatusCode());
        }

        $this->assertSame(200, $c->updateEnrollment($this->req('admin', 'PUT', ['expires_on' => '2026-12-01']), $e->id)->getStatusCode());
        $this->assertSame(200, $c->setSessionConsumes($this->req('admin', 'PUT', ['consumes' => true]), $e->id, $appt)->getStatusCode());
        $this->assertSame(200, $c->cancelEnrollment($this->req('admin', 'DELETE'), $e->id)->getStatusCode());
    }

    public function test_the_controller_isolates_businesses_and_turns_rule_errors_into_422(): void
    {
        $c = app(ProgramController::class);
        $program = $this->simpleProgram(2, 30.0);
        $body = ['program_id' => $program->id, 'employee_id' => $this->doc, 'sessions' => $this->schedule(2)];

        $this->assertSame(404, $c->enroll($this->req('admin', 'POST', $body), $this->ajena)->getStatusCode(), 'paciente de otro negocio');
        $this->assertSame(404, $c->forClient($this->req('admin'), $this->ajena)->getStatusCode());

        $r = $c->enroll($this->req('admin', 'POST', ['sessions' => $this->schedule(1)] + $body), $this->ana); // 1 sesión de 2
        $this->assertSame(422, $r->getStatusCode());
        $this->assertStringContainsString('2 sesiones', $this->asArray($r)['message']);

        $foreign = Enrollment::create(['id' => '60000000-0000-4000-8000-000000000001', 'business_id' => 'biz-2', 'client_id' => $this->ajena, 'program_name' => 'Ajeno', 'price' => 1, 'sessions_total' => 1, 'starts_on' => '2026-10-01', 'expires_on' => '2026-10-31', 'status' => 'active']);
        $this->assertSame(404, $c->cancelEnrollment($this->req('admin', 'DELETE'), $foreign->id)->getStatusCode());
    }

    public function test_the_for_client_listing_and_for_appointment_endpoint_return_progress(): void
    {
        $c = app(ProgramController::class);
        $e = $this->enrollAna($this->simpleProgram(2, 30.0));
        $first = $this->appointmentIds($e)[0];
        $this->setApptStatus($first, 'completed');

        $list = $this->asArray($c->forClient($this->req('cajero'), $this->ana));
        $this->assertCount(1, $list);
        $this->assertSame([1, 2, 1], [$list[0]['used'], $list[0]['sessions_total'], $list[0]['remaining']]);

        $this->assertSame(1, $this->asArray($c->forAppointment($this->req('cajero'), $first))['position']);
        $this->assertSame(204, $c->forAppointment($this->req('cajero'), '99999999-0000-4000-8000-000000000000')->getStatusCode());
    }
}
