<?php

namespace Tests\Feature\Clinical;

use App\Http\Controllers\Api\Clinical\AssessmentController;
use App\Http\Controllers\Api\Clinical\InformedConsentController;
use App\Http\Controllers\Api\Clinical\IntakeController;
use App\Http\Controllers\Api\Clinical\SessionNoteController;
use App\Http\Controllers\Api\Clinical\TreatmentPlanController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/**
 * Llama a los controllers directamente (sin pasar por Sanctum/middlewares) para probar lo que
 * ellos deciden: permiso de expediente, aislamiento por negocio, validación y códigos de respuesta.
 * Mismo esquema mínimo que ClinicalServicesTest: solo las migraciones clínicas sobre SQLite.
 */
class ClinicalControllersTest extends TestCase
{
    private const BIZ = 'biz-1';
    private const CLIENT = 'client-1';

    protected function setUp(): void
    {
        parent::setUp();

        config(['app.cipher' => 'AES-256-CBC', 'app.key' => 'base64:' . base64_encode(random_bytes(32))]);
        $this->app->forgetInstance('encrypter');

        Schema::disableForeignKeyConstraints();

        Schema::create('clients', function ($t) {
            $t->uuid('id')->primary();
            $t->uuid('business_id');
            $t->uuid('branch_id')->nullable();
        });
        Schema::create('services', function ($t) {
            $t->uuid('id')->primary();
            $t->string('name');
        });
        Schema::create('appointments', function ($t) {
            $t->uuid('id')->primary();
            $t->uuid('business_id');
            $t->uuid('client_id');
            $t->uuid('service_id')->nullable();
            $t->timestamp('start_time')->nullable();
            $t->string('status')->nullable();
        });
        foreach (glob(database_path('migrations/2026_10_05_00000*_create_clinical_*.php')) as $file) {
            (require $file)->up();
        }

        DB::table('clients')->insert([
            ['id' => self::CLIENT, 'business_id' => self::BIZ, 'branch_id' => null],
            ['id' => 'client-2', 'business_id' => self::BIZ, 'branch_id' => null],
            ['id' => 'foreign-client', 'business_id' => 'biz-2', 'branch_id' => null],
        ]);
    }

    private function req(string $role, string $method, array $body = [], bool $flag = true, string $userId = 'user-1'): Request
    {
        $request = Request::create('/api/x', $method, [], [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'], json_encode($body));
        $request->setUserResolver(fn () => (object) [
            'id' => $userId,
            'profile' => (object) ['role' => $role, 'business_id' => self::BIZ, 'can_access_dental_clinical' => $flag],
        ]);

        return $request;
    }

    private function code(JsonResponse $r): int
    {
        return $r->getStatusCode();
    }

    private function validNote(array $o = []): array
    {
        return array_merge([
            'session_date' => '2026-10-05', 'risk_level' => 'none', 'duration_minutes' => 50, 'mood_rating' => 7,
            'content' => ['subjective' => 'Se siente mejor', 'plan' => 'Continuar'],
        ], $o);
    }

    private function assertInvalid(callable $fn, string $field): void
    {
        try {
            $fn();
            $this->fail("Debió fallar la validación de {$field}.");
        } catch (ValidationException $e) {
            $this->assertArrayHasKey($field, $e->errors());
        }
    }

    // ── Acceso ──────────────────────────────────────────────────────────────────

    public function test_receptionist_and_flagless_employees_are_locked_out_of_every_clinical_endpoint(): void
    {
        $notes = app(SessionNoteController::class);
        $intake = app(IntakeController::class);

        $this->assertSame(403, $this->code($notes->index($this->req('cajero', 'GET'), self::CLIENT)));
        $this->assertSame(403, $this->code($notes->index($this->req('empleado', 'GET', [], false), self::CLIENT)));
        $this->assertSame(403, $this->code($intake->show($this->req('cajero', 'GET'), self::CLIENT)));
        $this->assertSame(403, $this->code($notes->store($this->req('empleado', 'POST', $this->validNote(), false), self::CLIENT)));
        $this->assertSame(0, DB::table('clinical_session_notes')->count());
    }

    public function test_a_patient_of_another_business_is_a_404_not_a_leak(): void
    {
        $this->assertSame(404, $this->code(app(SessionNoteController::class)->index($this->req('admin', 'GET'), 'foreign-client')));
        $this->assertSame(404, $this->code(app(IntakeController::class)->show($this->req('admin', 'GET'), 'foreign-client')));
        $this->assertSame(404, $this->code(app(SessionNoteController::class)->index($this->req('admin', 'GET'), 'no-existe')));
    }

    // ── Notas de sesión ─────────────────────────────────────────────────────────

    public function test_store_note_keeps_only_the_four_soap_sections(): void
    {
        $r = app(SessionNoteController::class)->store($this->req('empleado', 'POST', $this->validNote([
            'content' => ['subjective' => 'a', 'plan' => 'b', 'inyectado' => 'no debe guardarse'],
        ])), self::CLIENT);

        $this->assertSame(201, $this->code($r));
        $stored = \App\Models\Clinical\SessionNote::first();
        $this->assertSame(['subjective', 'plan'], array_keys($stored->content));
        $this->assertSame(1, $stored->session_number);
        $this->assertSame('user-1', $stored->created_by);
        $this->assertSame(self::BIZ, $stored->business_id);
    }

    public function test_store_note_validation(): void
    {
        $c = app(SessionNoteController::class);

        $this->assertInvalid(fn () => $c->store($this->req('admin', 'POST', $this->validNote(['risk_level' => 'extremo'])), self::CLIENT), 'risk_level');
        $this->assertInvalid(fn () => $c->store($this->req('admin', 'POST', $this->validNote(['session_date' => '05/10/2026'])), self::CLIENT), 'session_date');
        $this->assertInvalid(fn () => $c->store($this->req('admin', 'POST', $this->validNote(['mood_rating' => 11])), self::CLIENT), 'mood_rating');
        $this->assertInvalid(fn () => $c->store($this->req('admin', 'POST', $this->validNote(['duration_minutes' => 0])), self::CLIENT), 'duration_minutes');
        $this->assertInvalid(fn () => $c->store($this->req('admin', 'POST', $this->validNote(['appointment_id' => 'no-es-uuid'])), self::CLIENT), 'appointment_id');
        $this->assertSame(0, DB::table('clinical_session_notes')->count());
    }

    public function test_a_note_cannot_be_linked_to_another_patients_appointment(): void
    {
        $other = '11111111-1111-4111-8111-111111111111';
        $mine = '22222222-2222-4222-8222-222222222222';
        DB::table('appointments')->insert([
            ['id' => $other, 'business_id' => self::BIZ, 'client_id' => 'client-2'],
            ['id' => $mine, 'business_id' => self::BIZ, 'client_id' => self::CLIENT],
        ]);
        $c = app(SessionNoteController::class);

        $this->assertSame(422, $this->code($c->store($this->req('admin', 'POST', $this->validNote(['appointment_id' => $other])), self::CLIENT)));
        $this->assertSame(201, $this->code($c->store($this->req('admin', 'POST', $this->validNote(['appointment_id' => $mine])), self::CLIENT)));
        $this->assertSame(1, DB::table('clinical_session_notes')->count());
    }

    public function test_only_the_author_or_an_admin_can_edit_a_note(): void
    {
        $c = app(SessionNoteController::class);
        $id = json_decode($c->store($this->req('empleado', 'POST', $this->validNote(), true, 'author'), self::CLIENT)->getContent())->id;

        $edit = $this->validNote(['risk_level' => 'high']);

        $this->assertSame(403, $this->code($c->update($this->req('empleado', 'PUT', $edit, true, 'colleague'), self::CLIENT, $id)));
        $this->assertSame('none', \App\Models\Clinical\SessionNote::find($id)->risk_level);

        $this->assertSame(200, $this->code($c->update($this->req('empleado', 'PUT', $edit, true, 'author'), self::CLIENT, $id)));
        $this->assertSame(200, $this->code($c->update($this->req('admin', 'PUT', $this->validNote(['risk_level' => 'low']), true, 'boss'), self::CLIENT, $id)));
        $this->assertSame('low', \App\Models\Clinical\SessionNote::find($id)->risk_level);

        $this->assertSame(404, $this->code($c->update($this->req('admin', 'PUT', $edit), 'client-2', $id)));
    }

    // ── Historia clínica ────────────────────────────────────────────────────────

    public function test_intake_is_null_until_saved_then_created_once_and_updated_after(): void
    {
        $c = app(IntakeController::class);

        // Sin historia: 204 sin cuerpo (el frontend lo traduce a null). Nunca `{}`, que parecería una historia vacía.
        $first = $c->show($this->req('admin', 'GET'), self::CLIENT);
        $this->assertSame(204, $first->getStatusCode());
        $this->assertSame('', $first->getContent());

        $created = $c->upsert($this->req('admin', 'PUT', ['data' => ['consulta' => ['motivo' => 'Duelo']]]), self::CLIENT);
        $this->assertSame(201, $this->code($created));

        $updated = $c->upsert($this->req('admin', 'PUT', ['data' => ['consulta' => ['motivo' => 'Duelo complicado']]]), self::CLIENT);
        $this->assertSame(200, $this->code($updated));
        $this->assertSame(1, DB::table('clinical_intakes')->count());
        $shown = $c->show($this->req('admin', 'GET'), self::CLIENT);
        $this->assertSame(200, $shown->getStatusCode());
        $this->assertSame('Duelo complicado', json_decode($shown->getContent())->data->consulta->motivo);

        $this->assertInvalid(fn () => $c->upsert($this->req('admin', 'PUT', []), self::CLIENT), 'data');
    }

    // ── Plan terapéutico ────────────────────────────────────────────────────────

    public function test_treatment_plan_validation_and_store(): void
    {
        $c = app(TreatmentPlanController::class);
        $good = [
            'status' => 'active', 'start_date' => '2026-10-05', 'end_date' => '2026-12-05',
            'data' => ['approach' => 'TCC', 'goals' => [['id' => 'g1', 'text' => 'Dormir mejor', 'status' => 'in_progress']]],
        ];

        $this->assertSame(201, $this->code($c->store($this->req('admin', 'POST', $good), self::CLIENT)));

        $badStatus = $good;
        $badStatus['status'] = 'cerrado';
        $this->assertInvalid(fn () => $c->store($this->req('admin', 'POST', $badStatus), self::CLIENT), 'status');

        $badGoal = $good;
        $badGoal['data']['goals'][0]['status'] = 'hecho';
        $this->assertInvalid(fn () => $c->store($this->req('admin', 'POST', $badGoal), self::CLIENT), 'data.goals.0.status');

        $badDates = $good;
        $badDates['end_date'] = '2026-09-01';
        $this->assertInvalid(fn () => $c->store($this->req('admin', 'POST', $badDates), self::CLIENT), 'end_date');

        $this->assertSame(1, DB::table('clinical_treatment_plans')->count());
    }

    // ── Cuestionarios ───────────────────────────────────────────────────────────

    public function test_assessment_store_scores_on_the_server_and_validates_answers(): void
    {
        $c = app(AssessmentController::class);

        $ok = $c->store($this->req('admin', 'POST', ['instrument' => 'gad7', 'answers' => [3, 3, 3, 3, 3, 3, 3]]), self::CLIENT);
        $this->assertSame(201, $this->code($ok));
        $body = json_decode($ok->getContent());
        $this->assertSame(21, $body->total_score);
        $this->assertSame('severe', $body->severity);

        // Respuestas como texto (p. ej. formulario) se aceptan y se convierten a entero.
        $text = $c->store($this->req('admin', 'POST', ['instrument' => 'phq9', 'answers' => ['0', '0', '0', '0', '0', '0', '0', '0', '2']]), self::CLIENT);
        $this->assertSame(201, $this->code($text));
        $this->assertTrue(json_decode($text->getContent())->risk_flag);

        $this->assertSame(422, $this->code($c->store($this->req('admin', 'POST', ['instrument' => 'gad7', 'answers' => [1, 1]]), self::CLIENT)));
        $this->assertInvalid(fn () => $c->store($this->req('admin', 'POST', ['instrument' => 'gad7', 'answers' => [0, 0, 0, 0, 0, 0, 9]]), self::CLIENT), 'answers.6');
        $this->assertInvalid(fn () => $c->store($this->req('admin', 'POST', ['instrument' => 'beck', 'answers' => [1]]), self::CLIENT), 'instrument');
        $this->assertSame(2, DB::table('clinical_assessments')->count());
    }

    // ── Consentimiento ──────────────────────────────────────────────────────────

    public function test_consent_requires_a_signature_and_cannot_be_edited(): void
    {
        $c = app(InformedConsentController::class);

        $this->assertInvalid(fn () => $c->store($this->req('admin', 'POST', ['title' => 'T', 'content' => 'C']), self::CLIENT), 'signature_data');

        $this->assertSame(201, $this->code($c->store($this->req('admin', 'POST', [
            'title' => 'T', 'content' => 'C', 'signature_data' => 'data:image/png;base64,AAA', 'signer_name' => 'Tutor',
        ]), self::CLIENT)));

        $this->assertFalse(method_exists($c, 'update'), 'Un consentimiento firmado es inmutable: no debe existir update.');
        $this->assertCount(1, json_decode($c->index($this->req('admin', 'GET'), self::CLIENT)->getContent()));
    }
}
