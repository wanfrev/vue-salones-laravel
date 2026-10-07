<?php

namespace Tests\Feature\Clinical;

use App\Http\Controllers\Api\Clinical\CaseController;
use App\Http\Controllers\Api\Clinical\CaseRecordsController;
use App\Models\Clinical\AccessLog;
use App\Models\Clinical\SessionNote;
use App\Services\Clinical\CaseService;
use App\Services\Clinical\FollowUpService;
use App\Services\Clinical\ReportService;
use App\Services\Clinical\SessionNoteService;
use App\Services\Clinical\TreatmentPlanService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use Tests\TestCase;

class ClinicalCasesTest extends TestCase
{
    use BuildsClinicalSchema;

    private const BIZ = 'biz-1';

    // UUID reales: los controllers validan `uuid` en los ids de pacientes.
    private string $ana = '10000000-0000-4000-8000-000000000001';
    private string $beto = '10000000-0000-4000-8000-000000000002';
    private string $carla = '10000000-0000-4000-8000-000000000003';
    private string $dani = '10000000-0000-4000-8000-000000000004';
    private string $ajeno = '10000000-0000-4000-8000-0000000000aa';

    protected function setUp(): void
    {
        parent::setUp();
        $this->buildClinicalSchema();

        foreach (['ana' => 'Ana Pérez', 'beto' => 'Beto Ruiz', 'carla' => 'Carla Soto', 'dani' => 'Dani Lara'] as $k => $name) {
            DB::table('clients')->insert(['id' => $this->$k, 'business_id' => self::BIZ, 'full_name' => $name, 'phone' => "0414-{$k}"]);
        }
        DB::table('clients')->insert(['id' => $this->ajeno, 'business_id' => 'biz-2', 'full_name' => 'Otro negocio']);
        DB::table('services')->insert(['id' => 'sv', 'name' => 'Terapia de pareja']);
    }

    private function svc(): CaseService
    {
        return new CaseService();
    }

    private function couple(string $name = 'Pareja Pérez-Ruiz'): \App\Models\Clinical\ClinicalCase
    {
        return $this->svc()->create(self::BIZ, null, [
            'type' => 'couple', 'name' => $name,
            'members' => [['client_id' => $this->ana, 'role' => 'pareja'], ['client_id' => $this->beto, 'role' => 'pareja']],
        ], 'u1');
    }

    private function appt(string $client, string $when, string $status = 'completed'): string
    {
        $id = (string) Str::uuid();
        DB::table('appointments')->insert([
            'id' => $id, 'business_id' => self::BIZ, 'client_id' => $client, 'service_id' => 'sv', 'start_time' => $when, 'status' => $status,
        ]);

        return $id;
    }

    private function req(string $role = 'admin', string $method = 'GET', array $body = [], string $userId = 'u1', array $query = []): Request
    {
        $request = Request::create('/api/x', $method, $query, [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json', 'REMOTE_ADDR' => '10.0.0.9'], json_encode($body));
        $request->setUserResolver(fn () => (object) [
            'id' => $userId,
            'profile' => (object) ['id' => $userId, 'role' => $role, 'business_id' => self::BIZ, 'can_access_dental_clinical' => true],
        ]);

        return $request;
    }

    private function body(JsonResponse $r): mixed
    {
        return json_decode($r->getContent(), true);
    }

    private function note(array $o = []): array
    {
        return array_merge(['session_date' => '2026-10-05', 'risk_level' => 'none', 'content' => ['subjective' => 'sesión conjunta']], $o);
    }

    // ── Creación y reglas del caso ──────────────────────────────────────────────

    public function test_creating_a_case_makes_the_first_member_the_titular_by_default(): void
    {
        $case = $this->couple();

        $shown = $this->svc()->show($case);
        $this->assertSame('active', $shown['status']);
        $this->assertCount(2, $shown['members']);
        $this->assertSame($this->ana, $shown['members'][0]['client_id']);
        $this->assertTrue($shown['members'][0]['is_primary']);
        $this->assertFalse($shown['members'][1]['is_primary']);
        $this->assertSame('Ana Pérez', $shown['members'][0]['client_name']);
        $this->assertSame($this->ana, $this->svc()->titular($case));
    }

    public function test_a_chosen_titular_must_be_a_member(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->svc()->create(self::BIZ, null, [
            'type' => 'family', 'name' => 'F', 'primary_client_id' => $this->dani,
            'members' => [['client_id' => $this->ana], ['client_id' => $this->beto]],
        ], 'u1');
    }

    public function test_member_count_rules_per_type(): void
    {
        $make = fn (string $type, array $ids) => $this->svc()->create(self::BIZ, null, [
            'type' => $type, 'name' => 'X', 'members' => array_map(fn ($id) => ['client_id' => $id], $ids),
        ], 'u1');

        $this->assertSame('family', $make('family', [$this->ana, $this->beto, $this->carla])->type);
        $this->assertSame('group', $make('group', [$this->ana, $this->beto])->type);

        foreach ([['couple', [$this->ana, $this->beto, $this->carla]], ['family', [$this->ana]], ['couple', [$this->ana, $this->ana]]] as [$type, $ids]) {
            try {
                $make($type, $ids);
                $this->fail("{$type} con " . count($ids) . ' integrantes debió rechazarse');
            } catch (InvalidArgumentException) {
                $this->addToAssertionCount(1);
            }
        }
    }

    public function test_a_patient_of_another_business_can_never_be_linked(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->svc()->create(self::BIZ, null, [
            'type' => 'couple', 'name' => 'X', 'members' => [['client_id' => $this->ana], ['client_id' => $this->ajeno]],
        ], 'u1');
    }

    // ── Integrantes ─────────────────────────────────────────────────────────────

    public function test_leaving_keeps_the_row_and_history_and_the_titular_is_reassigned(): void
    {
        $case = $this->svc()->create(self::BIZ, null, [
            'type' => 'family', 'name' => 'Familia', 'members' => [['client_id' => $this->ana], ['client_id' => $this->beto], ['client_id' => $this->carla]],
        ], 'u1');

        $this->svc()->removeMember($case, $this->ana); // sale la titular

        $members = collect($this->svc()->show($case)['members'])->keyBy('client_id');
        $this->assertNotNull($members[$this->ana]['left_on']);          // la fila se conserva
        $this->assertFalse($members[$this->ana]['is_primary']);
        $this->assertNotNull($this->svc()->titular($case));              // siempre hay titular activo
        $this->assertNotSame($this->ana, $this->svc()->titular($case));
    }

    public function test_a_case_cannot_be_left_with_fewer_than_two_active_members(): void
    {
        $case = $this->couple();
        $this->expectException(InvalidArgumentException::class);
        $this->svc()->removeMember($case, $this->beto);
    }

    public function test_a_former_member_can_rejoin_without_duplicating_the_row(): void
    {
        $case = $this->svc()->create(self::BIZ, null, [
            'type' => 'family', 'name' => 'F', 'members' => [['client_id' => $this->ana], ['client_id' => $this->beto], ['client_id' => $this->carla]],
        ], 'u1');
        $this->svc()->removeMember($case, $this->carla);

        $this->svc()->addMember($case, $this->carla, 'hija');

        $this->assertSame(1, DB::table('clinical_case_members')->where('case_id', $case->id)->where('client_id', $this->carla)->count());
        $this->assertNull(collect($this->svc()->show($case)['members'])->firstWhere('client_id', $this->carla)['left_on']);
    }

    public function test_adding_rules_a_couple_is_full_and_an_active_member_cannot_be_added_twice(): void
    {
        $couple = $this->couple();
        $family = $this->svc()->create(self::BIZ, null, ['type' => 'family', 'name' => 'F', 'members' => [['client_id' => $this->ana], ['client_id' => $this->beto]]], 'u1');

        foreach ([[$couple, $this->carla], [$family, $this->ana]] as [$case, $client]) {
            try {
                $this->svc()->addMember($case, $client, null);
                $this->fail('Debió rechazarse');
            } catch (InvalidArgumentException) {
                $this->addToAssertionCount(1);
            }
        }
        $this->svc()->addMember($family, $this->carla, null); // este sí
        $this->assertCount(3, $this->svc()->show($family)['members']);
    }

    public function test_closing_stamps_the_date_blocks_new_members_and_reopening_clears_it(): void
    {
        $case = $this->svc()->create(self::BIZ, null, ['type' => 'family', 'name' => 'F', 'members' => [['client_id' => $this->ana], ['client_id' => $this->beto]]], 'u1');

        $closed = $this->svc()->update($case, ['status' => 'closed']);
        $this->assertSame('closed', $closed->status);
        $this->assertNotNull($closed->closed_on);

        try {
            $this->svc()->addMember($closed, $this->carla, null);
            $this->fail('Un caso cerrado no admite integrantes');
        } catch (InvalidArgumentException) {
            $this->addToAssertionCount(1);
        }

        $this->assertNull($this->svc()->update($closed, ['status' => 'active'])->closed_on);
    }

    // ── Citas ───────────────────────────────────────────────────────────────────

    public function test_an_appointment_links_only_for_an_active_member_and_moves_between_cases(): void
    {
        $a = $this->couple('A');
        $b = $this->svc()->create(self::BIZ, null, ['type' => 'family', 'name' => 'B', 'members' => [['client_id' => $this->ana], ['client_id' => $this->carla]]], 'u1');
        $appt = $this->appt($this->ana, '2026-10-01 10:00:00');
        $stranger = $this->appt($this->dani, '2026-10-01 11:00:00');

        $this->svc()->linkAppointment($a, $appt, 'u1');
        $this->assertSame($a->id, $this->svc()->caseForAppointment($appt, self::BIZ)['id']);

        $this->svc()->linkAppointment($b, $appt, 'u1'); // una cita pertenece a lo sumo a un caso: se reasigna
        $this->assertSame($b->id, $this->svc()->caseForAppointment($appt, self::BIZ)['id']);
        $this->assertSame(1, DB::table('clinical_case_appointments')->where('appointment_id', $appt)->count());

        try {
            $this->svc()->linkAppointment($a, $stranger, 'u1');
            $this->fail('La cita de un no integrante no debe vincularse');
        } catch (InvalidArgumentException) {
            $this->addToAssertionCount(1);
        }

        $this->svc()->unlinkAppointment($appt, self::BIZ);
        $this->assertNull($this->svc()->caseForAppointment($appt, self::BIZ));
    }

    // ── Notas conjuntas ─────────────────────────────────────────────────────────

    public function test_joint_and_individual_notes_never_mix(): void
    {
        $case = $this->couple();
        $notes = new SessionNoteService();

        $notes->create($this->ana, self::BIZ, null, $this->note(['content' => ['subjective' => 'INDIVIDUAL de Ana']]), 'u1');
        $joint = $notes->createForCase($case, $this->ana, null, $this->note(['content' => ['subjective' => 'CONJUNTA']]), 'u1');

        // La ficha individual de Ana (el titular) NO incluye la conjunta, y viceversa.
        $individual = $notes->listForClient($this->ana, self::BIZ);
        $this->assertCount(1, $individual);
        $this->assertSame('INDIVIDUAL de Ana', $individual[0]->content['subjective']);
        $this->assertNull($notes->findForClient($joint->id, $this->ana, self::BIZ)); // no editable como individual
        $this->assertCount(1, $notes->listForCase($case->id, self::BIZ));
        $this->assertSame($this->ana, $joint->client_id); // anclada al titular
    }

    public function test_numbering_is_independent_for_individual_and_per_case(): void
    {
        $case = $this->couple();
        $notes = new SessionNoteService();

        $notes->create($this->ana, self::BIZ, null, $this->note(), 'u1');
        $notes->create($this->ana, self::BIZ, null, $this->note(), 'u1');
        $j1 = $notes->createForCase($case, $this->ana, null, $this->note(), 'u1');
        $j2 = $notes->createForCase($case, $this->ana, null, $this->note(), 'u1');

        $this->assertSame([1, 2], [$j1->session_number, $j2->session_number]);
        $this->assertSame(3, $notes->create($this->ana, self::BIZ, null, $this->note(), 'u1')->session_number);
    }

    public function test_every_member_sees_the_joint_notes_in_their_file_with_the_case_name_and_nobody_else(): void
    {
        $case = $this->couple('Pareja Pérez-Ruiz');
        $notes = new SessionNoteService();
        $notes->createForCase($case, $this->ana, null, $this->note(), 'u1');
        $notes->create($this->beto, self::BIZ, null, $this->note(['content' => ['subjective' => 'PRIVADA de Beto']]), 'u1');

        $forBeto = $notes->jointForClient($this->beto, self::BIZ);
        $this->assertCount(1, $forBeto);
        $this->assertSame('Pareja Pérez-Ruiz', $forBeto[0]->case_name);
        $this->assertSame('sesión conjunta', $forBeto[0]->content['subjective']);

        // Beto ve la conjunta pero la nota PRIVADA de Beto no aparece en la ficha de Ana, ni la de Ana en la de Beto.
        $this->assertSame([], $notes->jointForClient($this->carla, self::BIZ)); // no integrante: nada
        $this->assertCount(1, $notes->listForClient($this->beto, self::BIZ));
        $this->assertCount(0, $notes->listForClient($this->ana, self::BIZ));
    }

    public function test_a_member_who_left_still_sees_the_sessions_they_attended(): void
    {
        $case = $this->svc()->create(self::BIZ, null, ['type' => 'family', 'name' => 'F', 'members' => [['client_id' => $this->ana], ['client_id' => $this->beto], ['client_id' => $this->carla]]], 'u1');
        (new SessionNoteService())->createForCase($case, $this->ana, null, $this->note(), 'u1');
        $this->svc()->removeMember($case, $this->carla);

        $this->assertCount(1, (new SessionNoteService())->jointForClient($this->carla, self::BIZ));
    }

    public function test_joint_content_is_encrypted_at_rest_like_any_note(): void
    {
        $case = $this->couple();
        (new SessionNoteService())->createForCase($case, $this->ana, null, $this->note(['content' => ['subjective' => 'infidelidad confesada']]), 'u1');

        $this->assertStringNotContainsString('infidelidad', DB::table('clinical_session_notes')->value('content'));
    }

    public function test_joint_plans_follow_the_same_separation(): void
    {
        $case = $this->couple();
        $plans = new TreatmentPlanService();
        $plans->create($this->ana, self::BIZ, null, ['status' => 'active', 'data' => ['approach' => 'individual']], 'u1');
        $plans->createForCase($case, $this->ana, null, ['status' => 'active', 'data' => ['approach' => 'conjunto']], 'u1');

        $this->assertCount(1, $plans->listForClient($this->ana, self::BIZ));
        $this->assertSame('individual', $plans->listForClient($this->ana, self::BIZ)[0]->data['approach']);
        $this->assertCount(1, $plans->listForCase($case->id, self::BIZ));
        $joint = $plans->jointForClient($this->beto, self::BIZ);
        $this->assertCount(1, $joint);
        $this->assertSame('conjunto', $joint[0]->data['approach']);
    }

    // ── Controllers: acceso, validación y auditoría ─────────────────────────────

    public function test_case_endpoints_enforce_clinical_access_and_business_isolation(): void
    {
        $case = $this->couple();
        $c = app(CaseController::class);
        $r = app(CaseRecordsController::class);

        $this->assertSame(403, $c->index($this->req('cajero'))->getStatusCode());
        $this->assertSame(403, $c->show($this->req('cajero'), $case->id)->getStatusCode());
        $this->assertSame(403, $r->notesIndex($this->req('cajero'), $case->id)->getStatusCode());
        $this->assertSame(404, $c->show($this->req('admin'), (string) Str::uuid())->getStatusCode());

        // Un caso de otro negocio es un 404 para este negocio, nunca un dato.
        $foreign = \App\Models\Clinical\ClinicalCase::create(['id' => (string) Str::uuid(), 'business_id' => 'biz-2', 'type' => 'couple', 'name' => 'Ajeno', 'status' => 'active']);
        $this->assertSame(404, $c->show($this->req('admin'), $foreign->id)->getStatusCode());
        $this->assertSame(404, $r->notesIndex($this->req('admin'), $foreign->id)->getStatusCode());
        $this->assertCount(1, $this->body($c->index($this->req('admin'))));
    }

    public function test_creating_through_the_controller_validates_and_audits(): void
    {
        $c = app(CaseController::class);
        $body = ['type' => 'couple', 'name' => 'Pareja X', 'members' => [['client_id' => $this->ana], ['client_id' => $this->beto]]];

        $created = $c->store($this->req('empleado', 'POST', $body));
        $this->assertSame(201, $created->getStatusCode());
        $this->assertSame(1, AccessLog::where('action', 'created')->where('resource', 'case')->count());
        $this->assertSame($this->ana, AccessLog::first()->client_id); // atribuido al titular
        $this->assertNotNull(AccessLog::first()->case_id);

        foreach ([
            array_merge($body, ['type' => 'orgia']),
            array_merge($body, ['members' => [['client_id' => $this->ana]]]),
            array_merge($body, ['members' => [['client_id' => 'no-uuid'], ['client_id' => $this->beto]]]),
            array_merge($body, ['name' => '']),
        ] as $bad) {
            try {
                $c->store($this->req('admin', 'POST', $bad));
                $this->fail('Debió fallar la validación');
            } catch (ValidationException) {
                $this->addToAssertionCount(1);
            }
        }

        // Reglas de negocio (no de formato) → 422 con mensaje, no 500.
        $three = array_merge($body, ['members' => [['client_id' => $this->ana], ['client_id' => $this->beto], ['client_id' => $this->carla]]]);
        $this->assertSame(422, $c->store($this->req('admin', 'POST', $three))->getStatusCode());
        $foreign = array_merge($body, ['members' => [['client_id' => $this->ana], ['client_id' => $this->ajeno]]]);
        $this->assertSame(422, $c->store($this->req('admin', 'POST', $foreign))->getStatusCode());
    }

    public function test_joint_note_endpoints_link_the_titular_check_the_appointment_and_restrict_editing(): void
    {
        $case = $this->couple();
        $other = $this->svc()->create(self::BIZ, null, ['type' => 'family', 'name' => 'Otro', 'members' => [['client_id' => $this->carla], ['client_id' => $this->dani]]], 'u1');
        $mine = $this->appt($this->ana, '2026-10-01 10:00:00');
        $this->svc()->linkAppointment($case, $mine, 'u1');
        $foreignAppt = $this->appt($this->carla, '2026-10-01 11:00:00');
        $this->svc()->linkAppointment($other, $foreignAppt, 'u1');
        $r = app(CaseRecordsController::class);

        // Una cita de OTRO caso no puede respaldar la nota de este.
        $this->assertSame(422, $r->notesStore($this->req('empleado', 'POST', $this->note(['appointment_id' => $foreignAppt]), 'author'), $case->id)->getStatusCode());

        $ok = $r->notesStore($this->req('empleado', 'POST', $this->note(['appointment_id' => $mine]), 'author'), $case->id);
        $this->assertSame(201, $ok->getStatusCode());
        $id = $this->body($ok)['id'];
        $this->assertSame($this->ana, SessionNote::find($id)->client_id);
        $this->assertSame($case->id, SessionNote::find($id)->case_id);

        // Solo el autor o un admin la edita.
        $this->assertSame(403, $r->notesUpdate($this->req('empleado', 'PUT', $this->note(['risk_level' => 'high']), 'colleague'), $case->id, $id)->getStatusCode());
        $this->assertSame(200, $r->notesUpdate($this->req('empleado', 'PUT', $this->note(['risk_level' => 'high']), 'author'), $case->id, $id)->getStatusCode());
        $this->assertSame(200, $r->notesUpdate($this->req('admin', 'PUT', $this->note(['risk_level' => 'low']), 'boss'), $case->id, $id)->getStatusCode());
        // Y no se puede tocar a través de otro caso.
        $this->assertSame(404, $r->notesUpdate($this->req('admin', 'PUT', $this->note()), $other->id, $id)->getStatusCode());

        $this->assertSame(1, AccessLog::where('resource', 'session_note')->where('action', 'created')->where('case_id', $case->id)->count());
    }

    public function test_the_member_file_endpoints_return_joint_records_and_audit_the_read(): void
    {
        $case = $this->couple();
        (new SessionNoteService())->createForCase($case, $this->ana, null, $this->note(), 'u1');
        $r = app(CaseRecordsController::class);

        $notes = $this->body($r->jointNotesForClient($this->req('empleado'), $this->beto));
        $this->assertCount(1, $notes);
        $this->assertSame('Pareja Pérez-Ruiz', $notes[0]['case_name']);
        $this->assertSame(1, AccessLog::where('detail', 'joint')->where('client_id', $this->beto)->count());

        $this->assertSame(403, $r->jointNotesForClient($this->req('cajero'), $this->beto)->getStatusCode());
        $this->assertSame(404, $r->jointNotesForClient($this->req('admin'), $this->ajeno)->getStatusCode());
    }

    // ── Seguimiento, asistencia ─────────────────────────────────────────────────

    public function test_a_joint_sessions_risk_alerts_the_case_not_an_individual(): void
    {
        $now = CarbonImmutable::parse('2026-10-05 12:00:00');
        $case = $this->couple();
        (new SessionNoteService())->createForCase($case, $this->ana, null, $this->note(['risk_level' => 'high', 'session_date' => '2026-10-01']), 'u1');
        (new SessionNoteService())->create($this->carla, self::BIZ, null, $this->note(['risk_level' => 'high', 'session_date' => '2026-10-02']), 'u1');
        $fu = new FollowUpService();

        $cases = $fu->riskCases(self::BIZ, $now);
        $this->assertSame([$case->id], array_column($cases, 'case_id'));
        $this->assertSame('Pareja Pérez-Ruiz', $cases[0]['case_name']);
        $this->assertSame(4, $cases[0]['days_since']);

        // El riesgo individual NO se contagia de la nota conjunta (Ana no aparece), solo Carla.
        $this->assertSame([$this->carla], array_column($fu->riskUnfollowed(self::BIZ, $now), 'client_id'));
    }

    public function test_a_future_linked_appointment_or_a_closed_case_silences_the_case_alert(): void
    {
        $now = CarbonImmutable::parse('2026-10-05 12:00:00');
        $case = $this->couple();
        (new SessionNoteService())->createForCase($case, $this->ana, null, $this->note(['risk_level' => 'moderate']), 'u1');
        $fu = new FollowUpService();
        $this->assertCount(1, $fu->riskCases(self::BIZ, $now));

        $future = $this->appt($this->ana, '2026-10-12 10:00:00', 'confirmed');
        $this->svc()->linkAppointment($case, $future, 'u1');
        $this->assertSame([], $fu->riskCases(self::BIZ, $now)); // ya hay próxima sesión del caso

        DB::table('appointments')->where('id', $future)->update(['status' => 'cancelled']);
        $this->assertCount(1, $fu->riskCases(self::BIZ, $now)); // cancelada: nadie los espera

        $this->svc()->update($case, ['status' => 'closed']);
        $this->assertSame([], $fu->riskCases(self::BIZ, $now)); // caso cerrado: ya no se vigila
    }

    public function test_pending_notes_flag_case_sessions_so_the_note_is_written_on_the_case(): void
    {
        $now = CarbonImmutable::parse('2026-10-05 12:00:00');
        $case = $this->couple();
        $appt = $this->appt($this->ana, '2026-10-02 10:00:00');
        $this->svc()->linkAppointment($case, $appt, 'u1');
        $individual = $this->appt($this->carla, '2026-10-03 10:00:00');

        $rows = collect((new FollowUpService())->notesPending(self::BIZ, null, $now))->keyBy('appointment_id');
        $this->assertSame($case->id, $rows[$appt]['case_id']);
        $this->assertSame('Pareja Pérez-Ruiz', $rows[$appt]['case_name']);
        $this->assertNull($rows[$individual]['case_id']);

        // Al escribir la nota conjunta de esa cita, deja de estar pendiente.
        (new SessionNoteService())->createForCase($case, $this->ana, null, $this->note(['appointment_id' => $appt]), 'u1');
        $this->assertSame([$individual], array_column((new FollowUpService())->notesPending(self::BIZ, null, $now), 'appointment_id'));
    }

    public function test_attendance_counts_case_sessions_for_every_member_not_just_the_titular(): void
    {
        $case = $this->couple();
        $joint = $this->appt($this->ana, '2026-09-10 10:00:00');          // a nombre del titular
        $this->svc()->linkAppointment($case, $joint, 'u1');
        $own = $this->appt($this->beto, '2026-09-20 10:00:00');           // individual de Beto
        $unlinked = $this->appt($this->ana, '2026-09-25 10:00:00');       // de Ana, sin caso

        $betoRows = (new ReportService())->attendance(self::BIZ, $this->beto, '2026-09-01', '2026-09-30');
        $this->assertSame([$joint, $own], array_column($betoRows, 'id')); // asistió a la conjunta y a la suya

        $carlaRows = (new ReportService())->attendance(self::BIZ, $this->carla, '2026-09-01', '2026-09-30');
        $this->assertSame([], $carlaRows); // no integrante: nada

        $this->assertNotContains($unlinked, array_column($betoRows, 'id')); // la individual de Ana no es de Beto
    }
}
