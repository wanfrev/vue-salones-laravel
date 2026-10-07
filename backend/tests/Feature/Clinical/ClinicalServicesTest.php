<?php

namespace Tests\Feature\Clinical;

use App\Models\Clinical\Assessment;
use App\Models\Clinical\Intake;
use App\Models\Clinical\SessionNote;
use App\Models\Clinical\TreatmentPlan;
use App\Services\Clinical\AssessmentService;
use App\Services\Clinical\IntakeService;
use App\Services\Clinical\InformedConsentService;
use App\Services\Clinical\SessionNoteService;
use App\Services\Clinical\TreatmentPlanService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;
use Tests\TestCase;

/**
 * Corre SOLO las 5 migraciones clínicas contra SQLite en memoria (el resto del esquema usa
 * características de Postgres), con las tablas padre mínimas que necesitan los servicios y los
 * FK apagados — lo que se prueba es la lógica de los servicios y el cifrado en reposo.
 */
class ClinicalServicesTest extends TestCase
{
    use BuildsClinicalSchema;

    private const BIZ = 'biz-1';
    private const OTHER_BIZ = 'biz-2';
    private const CLIENT = 'client-1';
    private const OTHER_CLIENT = 'client-2';

    protected function setUp(): void
    {
        parent::setUp();

        $this->buildClinicalSchema();

        DB::table('clients')->insert([['id' => self::CLIENT], ['id' => self::OTHER_CLIENT]]);
    }

    private function noteData(array $override = []): array
    {
        return array_merge([
            'session_date' => '2026-10-05',
            'risk_level' => 'low',
            'duration_minutes' => 50,
            'mood_rating' => 6,
            'content' => ['subjective' => 'Refiere insomnio persistente', 'objective' => '', 'assessment' => '', 'plan' => 'Higiene del sueño'],
            'tasks' => 'Registro de sueño',
        ], $override);
    }

    // ── Notas de sesión ─────────────────────────────────────────────────────────

    public function test_session_numbers_increment_per_patient_not_globally(): void
    {
        $svc = new SessionNoteService();

        $a1 = $svc->create(self::CLIENT, self::BIZ, null, $this->noteData(), 'u1');
        $a2 = $svc->create(self::CLIENT, self::BIZ, null, $this->noteData(), 'u1');
        $b1 = $svc->create(self::OTHER_CLIENT, self::BIZ, null, $this->noteData(), 'u1');

        $this->assertSame(1, $a1->session_number);
        $this->assertSame(2, $a2->session_number);
        $this->assertSame(1, $b1->session_number);
    }

    public function test_session_note_body_is_encrypted_at_rest_but_readable_through_the_model(): void
    {
        $note = (new SessionNoteService())->create(self::CLIENT, self::BIZ, null, $this->noteData(), 'u1');

        $raw = DB::table('clinical_session_notes')->where('id', $note->id)->first();
        $this->assertStringNotContainsString('insomnio', $raw->content);
        $this->assertStringNotContainsString('Registro de sueño', $raw->tasks);
        // risk_level queda en claro a propósito: se usa para alertar sin descifrar la nota.
        $this->assertSame('low', $raw->risk_level);

        $fresh = SessionNote::find($note->id);
        $this->assertSame('Refiere insomnio persistente', $fresh->content['subjective']);
        $this->assertSame('Registro de sueño', $fresh->tasks);
        $this->assertSame('2026-10-05', $fresh->session_date->format('Y-m-d'));
    }

    public function test_listing_is_scoped_to_the_business_and_the_patient(): void
    {
        $svc = new SessionNoteService();
        $svc->create(self::CLIENT, self::BIZ, null, $this->noteData(), 'u1');
        $svc->create(self::OTHER_CLIENT, self::BIZ, null, $this->noteData(), 'u1');
        $svc->create(self::CLIENT, self::OTHER_BIZ, null, $this->noteData(), 'u9');

        $this->assertCount(1, $svc->listForClient(self::CLIENT, self::BIZ));
        $this->assertCount(1, $svc->listForClient(self::CLIENT, self::OTHER_BIZ));
    }

    public function test_a_note_cannot_be_read_through_another_business_or_patient(): void
    {
        $svc = new SessionNoteService();
        $note = $svc->create(self::CLIENT, self::BIZ, null, $this->noteData(), 'u1');

        $this->assertNotNull($svc->findForClient($note->id, self::CLIENT, self::BIZ));
        $this->assertNull($svc->findForClient($note->id, self::CLIENT, self::OTHER_BIZ));
        $this->assertNull($svc->findForClient($note->id, self::OTHER_CLIENT, self::BIZ));
    }

    public function test_update_only_touches_editable_fields(): void
    {
        $svc = new SessionNoteService();
        $note = $svc->create(self::CLIENT, self::BIZ, null, $this->noteData(), 'u1');

        $updated = $svc->update($note, $this->noteData([
            'risk_level' => 'high',
            'content' => ['plan' => 'Derivar a psiquiatría'],
            // Intentos de reescribir identidad/propiedad: deben ignorarse.
            'business_id' => self::OTHER_BIZ,
            'client_id' => self::OTHER_CLIENT,
            'session_number' => 99,
            'created_by' => 'intruso',
        ]));

        $this->assertSame('high', $updated->risk_level);
        $this->assertSame('Derivar a psiquiatría', $updated->content['plan']);
        $this->assertSame(self::BIZ, $updated->business_id);
        $this->assertSame(self::CLIENT, $updated->client_id);
        $this->assertSame(1, $updated->session_number);
        $this->assertSame('u1', $updated->created_by);
    }

    public function test_appointment_link_must_belong_to_the_same_patient_and_business(): void
    {
        DB::table('appointments')->insert([
            ['id' => 'ap-ok', 'business_id' => self::BIZ, 'client_id' => self::CLIENT],
            ['id' => 'ap-other-client', 'business_id' => self::BIZ, 'client_id' => self::OTHER_CLIENT],
            ['id' => 'ap-other-biz', 'business_id' => self::OTHER_BIZ, 'client_id' => self::CLIENT],
        ]);
        $svc = new SessionNoteService();

        $this->assertTrue($svc->appointmentBelongsToClient(null, self::CLIENT, self::BIZ));
        $this->assertTrue($svc->appointmentBelongsToClient('ap-ok', self::CLIENT, self::BIZ));
        $this->assertFalse($svc->appointmentBelongsToClient('ap-other-client', self::CLIENT, self::BIZ));
        $this->assertFalse($svc->appointmentBelongsToClient('ap-other-biz', self::CLIENT, self::BIZ));
        $this->assertFalse($svc->appointmentBelongsToClient('ap-inexistente', self::CLIENT, self::BIZ));
    }

    public function test_recent_appointments_are_bounded_scoped_and_newest_first(): void
    {
        DB::table('services')->insert(['id' => 'sv-1', 'name' => 'Psicoterapia individual']);
        $rows = [];
        for ($i = 1; $i <= 35; $i++) {
            $rows[] = [
                'id' => "ap-{$i}", 'business_id' => self::BIZ, 'client_id' => self::CLIENT, 'service_id' => 'sv-1',
                'start_time' => sprintf('2026-09-%02d 10:00:00', $i <= 30 ? $i : 30), 'status' => 'confirmed',
            ];
        }
        $rows[] = ['id' => 'ap-x', 'business_id' => self::BIZ, 'client_id' => self::OTHER_CLIENT, 'service_id' => 'sv-1', 'start_time' => '2026-09-30 11:00:00', 'status' => 'confirmed'];
        DB::table('appointments')->insert($rows);

        $list = (new SessionNoteService())->recentAppointments(self::CLIENT, self::BIZ);

        $this->assertCount(30, $list); // acotado: nunca el historial completo
        $this->assertSame('Psicoterapia individual', $list[0]['service_name']);
        $this->assertNotContains('ap-x', array_column($list, 'id')); // nada de otro paciente
    }

    // ── Historia clínica ────────────────────────────────────────────────────────

    public function test_intake_is_one_living_record_per_patient_and_encrypted_at_rest(): void
    {
        $svc = new IntakeService();

        $first = $svc->upsert(self::CLIENT, self::BIZ, null, ['consulta' => ['motivo' => 'Ataques de pánico']], 'u1');
        $second = $svc->upsert(self::CLIENT, self::BIZ, null, ['consulta' => ['motivo' => 'Ataques de pánico y evitación']], 'u2');

        $this->assertSame($first->id, $second->id);
        $this->assertSame(1, Intake::count());
        $this->assertSame('u1', $second->created_by);
        $this->assertSame('u2', $second->updated_by);
        $this->assertSame('Ataques de pánico y evitación', $second->data['consulta']['motivo']);

        $raw = DB::table('clinical_intakes')->first();
        $this->assertStringNotContainsString('pánico', $raw->data);
        $this->assertNull($svc->findForClient(self::OTHER_CLIENT, self::BIZ));
    }

    // ── Plan terapéutico ────────────────────────────────────────────────────────

    public function test_treatment_plan_round_trips_goals_and_encrypts_them(): void
    {
        $svc = new TreatmentPlanService();
        $plan = $svc->create(self::CLIENT, self::BIZ, null, [
            'status' => 'active',
            'start_date' => '2026-10-05',
            'data' => ['approach' => 'TCC', 'goals' => [['id' => 'g1', 'text' => 'Reducir rumiación', 'status' => 'pending']]],
        ], 'u1');

        $this->assertStringNotContainsString('rumiación', DB::table('clinical_treatment_plans')->value('data'));

        $updated = $svc->update($plan, ['status' => 'completed', 'business_id' => self::OTHER_BIZ]);
        $this->assertSame('completed', $updated->status);
        $this->assertSame(self::BIZ, $updated->business_id);
        $this->assertSame('Reducir rumiación', TreatmentPlan::find($plan->id)->data['goals'][0]['text']);
    }

    // ── Cuestionarios ───────────────────────────────────────────────────────────

    public function test_assessment_score_is_always_computed_by_the_server(): void
    {
        $svc = new AssessmentService();

        // El cliente intenta colar un puntaje falso: se ignora, se recalcula.
        $a = $svc->create(self::CLIENT, self::BIZ, null, [
            'instrument' => 'phq9',
            'answers' => [3, 3, 3, 3, 3, 3, 3, 3, 1],
            'total_score' => 0, 'severity' => 'minimal', 'risk_flag' => false,
        ], 'u1');

        $this->assertSame(25, $a->total_score);
        $this->assertSame('severe', $a->severity);
        $this->assertTrue($a->risk_flag);
        $this->assertSame([3, 3, 3, 3, 3, 3, 3, 3, 1], Assessment::find($a->id)->answers);
    }

    public function test_assessment_with_an_invalid_answer_set_is_rejected_before_saving(): void
    {
        try {
            (new AssessmentService())->create(self::CLIENT, self::BIZ, null, ['instrument' => 'gad7', 'answers' => [1, 1]], 'u1');
            $this->fail('Debió rechazar un GAD-7 incompleto.');
        } catch (InvalidArgumentException) {
            $this->assertSame(0, Assessment::count());
        }
    }

    // ── Consentimiento ──────────────────────────────────────────────────────────

    public function test_consent_is_stored_signed_and_scoped(): void
    {
        $svc = new InformedConsentService();
        $c = $svc->create(self::CLIENT, self::BIZ, null, [
            'title' => 'Consentimiento — menor', 'content' => 'Texto', 'signature_data' => 'data:image/png;base64,AAA',
            'signer_name' => 'María Pérez', 'signer_relationship' => 'Madre',
        ], 'u1');

        $this->assertNotNull($c->signed_at);
        $this->assertSame('Madre', $c->signer_relationship);
        $this->assertCount(1, $svc->listForClient(self::CLIENT, self::BIZ));
        $this->assertCount(0, $svc->listForClient(self::CLIENT, self::OTHER_BIZ));
        $this->assertNull($svc->findForClient($c->id, self::CLIENT, self::OTHER_BIZ));
    }
}
