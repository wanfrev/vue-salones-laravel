<?php

namespace Tests\Feature\Clinical;

use App\Http\Controllers\Api\Clinical\AssessmentController;
use App\Http\Controllers\Api\Clinical\AuditController;
use App\Http\Controllers\Api\Clinical\IntakeController;
use App\Http\Controllers\Api\Clinical\ReportController;
use App\Http\Controllers\Api\Clinical\SessionNoteController;
use App\Models\Clinical\AccessLog;
use App\Services\Clinical\ClinicalAuditService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use Tests\TestCase;

class ClinicalAuditTest extends TestCase
{
    use BuildsClinicalSchema;

    private const BIZ = 'biz-1';
    private const CLIENT = 'client-1';

    protected function setUp(): void
    {
        parent::setUp();
        $this->buildClinicalSchema();

        DB::table('clients')->insert([
            ['id' => self::CLIENT, 'business_id' => self::BIZ, 'full_name' => 'Ana Pérez'],
            ['id' => 'client-2', 'business_id' => self::BIZ, 'full_name' => 'Luis Gómez'],
        ]);
        DB::table('profiles')->insert([['id' => 'user-1', 'full_name' => 'Dra. Rivas'], ['id' => 'user-2', 'full_name' => 'Lic. Mora']]);
    }

    private function req(string $role, string $method = 'GET', array $body = [], string $userId = 'user-1', array $query = []): Request
    {
        $request = Request::create('/api/x', $method, $query, [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json', 'REMOTE_ADDR' => '10.0.0.7'], json_encode($body));
        $request->setUserResolver(fn () => (object) [
            'id' => $userId,
            'profile' => (object) ['id' => $userId, 'role' => $role, 'business_id' => self::BIZ, 'can_access_dental_clinical' => true],
        ]);

        return $request;
    }

    private function note(): array
    {
        return ['session_date' => '2026-10-05', 'risk_level' => 'none', 'content' => ['subjective' => 'x']];
    }

    // ── Qué se registra ─────────────────────────────────────────────────────────

    public function test_writes_are_always_logged_with_who_what_and_ip(): void
    {
        app(SessionNoteController::class)->store($this->req('empleado', 'POST', $this->note(), 'user-1'), self::CLIENT);
        app(SessionNoteController::class)->store($this->req('empleado', 'POST', $this->note(), 'user-1'), self::CLIENT);

        $logs = AccessLog::where('action', 'created')->get();
        $this->assertCount(2, $logs); // las escrituras NO se deduplican
        $log = $logs->first();
        $this->assertSame(self::BIZ, $log->business_id);
        $this->assertSame(self::CLIENT, $log->client_id);
        $this->assertSame('user-1', $log->user_id);
        $this->assertSame('session_note', $log->resource);
        $this->assertNotNull($log->resource_id);
        $this->assertSame('10.0.0.7', $log->ip);
    }

    public function test_updates_and_intake_changes_are_logged(): void
    {
        $notes = app(SessionNoteController::class);
        $id = json_decode($notes->store($this->req('empleado', 'POST', $this->note()), self::CLIENT)->getContent())->id;
        $notes->update($this->req('empleado', 'PUT', $this->note()), self::CLIENT, $id);
        app(IntakeController::class)->upsert($this->req('admin', 'PUT', ['data' => ['consulta' => ['motivo' => 'x']]]), self::CLIENT);
        app(IntakeController::class)->upsert($this->req('admin', 'PUT', ['data' => ['consulta' => ['motivo' => 'y']]]), self::CLIENT);

        $this->assertSame(1, AccessLog::where('action', 'updated')->where('resource', 'session_note')->count());
        $this->assertSame(1, AccessLog::where('action', 'created')->where('resource', 'intake')->count());
        $this->assertSame(1, AccessLog::where('action', 'updated')->where('resource', 'intake')->count());
    }

    public function test_reads_are_logged_once_per_person_per_resource_within_the_dedup_window(): void
    {
        $notes = app(SessionNoteController::class);
        for ($i = 0; $i < 4; $i++) $notes->index($this->req('empleado', 'GET', [], 'user-1'), self::CLIENT);
        $notes->index($this->req('empleado', 'GET', [], 'user-2'), self::CLIENT);          // otra persona: sí cuenta
        app(AssessmentController::class)->index($this->req('empleado', 'GET', [], 'user-1'), self::CLIENT); // otro recurso: sí cuenta

        $this->assertSame(1, AccessLog::where('action', 'viewed')->where('resource', 'session_note')->where('user_id', 'user-1')->count());
        $this->assertSame(1, AccessLog::where('action', 'viewed')->where('resource', 'session_note')->where('user_id', 'user-2')->count());
        $this->assertSame(1, AccessLog::where('action', 'viewed')->where('resource', 'assessment')->count());
    }

    public function test_a_read_after_the_window_is_logged_again(): void
    {
        $svc = new ClinicalAuditService();
        $svc->record(self::BIZ, self::CLIENT, 'user-1', 'viewed', 'intake');
        AccessLog::query()->toBase()->update(['created_at' => now()->subMinutes(ClinicalAuditService::VIEW_DEDUP_MINUTES + 1)]);

        $this->assertNotNull($svc->record(self::BIZ, self::CLIENT, 'user-1', 'viewed', 'intake'));
        $this->assertSame(2, AccessLog::count());
    }

    public function test_denied_requests_leave_no_log_and_no_patient_data(): void
    {
        $r = app(SessionNoteController::class)->index($this->req('cajero'), self::CLIENT);
        $this->assertSame(403, $r->getStatusCode());
        $this->assertSame(0, AccessLog::count());
    }

    public function test_a_failing_audit_write_never_breaks_the_clinical_request(): void
    {
        \Illuminate\Support\Facades\Schema::drop('clinical_access_logs');

        $r = app(SessionNoteController::class)->store($this->req('empleado', 'POST', $this->note()), self::CLIENT);

        $this->assertSame(201, $r->getStatusCode()); // la nota se guardó pese a que la bitácora falló
        $this->assertSame(1, DB::table('clinical_session_notes')->count());
    }

    public function test_the_log_is_append_only(): void
    {
        $log = (new ClinicalAuditService())->record(self::BIZ, self::CLIENT, 'user-1', 'created', 'intake', 'x');

        $log->action = 'viewed';
        $this->assertFalse($log->save());
        $this->assertFalse($log->delete());
        $this->assertSame('created', AccessLog::find($log->id)->action);
    }

    public function test_invalid_action_or_resource_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        (new ClinicalAuditService())->record(self::BIZ, self::CLIENT, 'user-1', 'borrado', 'intake');
    }

    // ── Impresión de informes ───────────────────────────────────────────────────

    public function test_printing_a_report_is_logged_with_its_kind(): void
    {
        $c = app(ReportController::class);

        $this->assertSame(201, $c->printed($this->req('empleado', 'POST', ['kind' => 'referral']), self::CLIENT)->getStatusCode());

        $log = AccessLog::first();
        $this->assertSame('report_printed', $log->action);
        $this->assertSame('report', $log->resource);
        $this->assertSame('referral', $log->detail);

        try {
            $c->printed($this->req('empleado', 'POST', ['kind' => 'otro']), self::CLIENT);
            $this->fail('Debió rechazar un tipo de informe inválido.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('kind', $e->errors());
        }
        $this->assertSame(403, $c->printed($this->req('cajero', 'POST', ['kind' => 'referral']), self::CLIENT)->getStatusCode());
        $this->assertSame(1, AccessLog::count());
    }

    // ── Consulta de la bitácora ─────────────────────────────────────────────────

    private function listAs(string $role, array $query = []): JsonResponse
    {
        return app(AuditController::class)->index($this->req($role, 'GET', [], 'user-1', $query));
    }

    public function test_only_the_business_admin_can_read_the_log(): void
    {
        foreach (['empleado', 'cajero', 'encargado'] as $role) {
            $this->assertSame(403, $this->listAs($role)->getStatusCode(), $role);
        }
        $this->assertSame(200, $this->listAs('admin')->getStatusCode());
    }

    public function test_listing_joins_names_and_orders_newest_first(): void
    {
        $svc = new ClinicalAuditService();
        $svc->record(self::BIZ, self::CLIENT, 'user-1', 'created', 'intake');
        AccessLog::query()->toBase()->update(['created_at' => now()->subHour()]);
        $svc->record(self::BIZ, 'client-2', 'user-2', 'updated', 'session_note', 'n-1');

        $rows = json_decode($this->listAs('admin')->getContent(), true)['rows'];

        $this->assertCount(2, $rows);
        $this->assertSame(['Luis Gómez', 'Lic. Mora', 'updated'], [$rows[0]['client_name'], $rows[0]['user_name'], $rows[0]['action']]);
        $this->assertSame(['Ana Pérez', 'Dra. Rivas'], [$rows[1]['client_name'], $rows[1]['user_name']]);
    }

    public function test_listing_survives_a_deleted_patient_or_user(): void
    {
        (new ClinicalAuditService())->record(self::BIZ, 'ya-no-existe', 'user-fantasma', 'viewed', 'intake');

        $row = json_decode($this->listAs('admin')->getContent(), true)['rows'][0];

        $this->assertNull($row['client_name']);
        $this->assertNull($row['user_name']);
    }

    public function test_filters_and_business_isolation(): void
    {
        $svc = new ClinicalAuditService();
        $svc->record(self::BIZ, self::CLIENT, 'user-1', 'created', 'intake');
        $svc->record(self::BIZ, 'client-2', 'user-2', 'updated', 'intake');
        $svc->record('otro-negocio', self::CLIENT, 'user-1', 'created', 'intake');

        $all = json_decode($this->listAs('admin')->getContent(), true)['rows'];
        $this->assertCount(2, $all); // nunca el otro negocio

        $this->assertCount(1, json_decode($this->listAs('admin', ['action' => 'updated'])->getContent(), true)['rows']);
        // Los ids de prueba no son UUID (el controller exige UUID), así que el filtro por paciente y por usuario se prueba en el servicio.
        $byClient = (new ClinicalAuditService())->list(self::BIZ, ['client_id' => 'client-2']);
        $this->assertCount(1, $byClient['rows']);
        $this->assertSame('user-2', $byClient['rows'][0]['user_id']);
        $this->assertCount(1, (new ClinicalAuditService())->list(self::BIZ, ['user_id' => 'user-1'])['rows']);

        // El controller sí rechaza un filtro que no sea UUID.
        $this->expectException(ValidationException::class);
        $this->listAs('admin', ['client_id' => 'no-es-uuid']);
    }

    public function test_the_date_range_is_bounded_and_defaults_to_thirty_days(): void
    {
        $svc = new ClinicalAuditService();
        $svc->record(self::BIZ, self::CLIENT, 'user-1', 'created', 'intake');
        $old = $svc->record(self::BIZ, self::CLIENT, 'user-1', 'updated', 'intake');
        AccessLog::query()->toBase()->where('id', $old->id)->update(['created_at' => now()->subDays(60)]);

        $default = json_decode($this->listAs('admin')->getContent(), true);
        $this->assertCount(1, $default['rows']); // el de hace 60 días queda fuera del rango por defecto

        $wide = $this->listAs('admin', ['from' => now()->subDays(90)->toDateString(), 'to' => now()->toDateString()]);
        $this->assertCount(2, json_decode($wide->getContent(), true)['rows']);

        $tooWide = $this->listAs('admin', ['from' => now()->subDays(400)->toDateString(), 'to' => now()->toDateString()]);
        $this->assertSame(422, $tooWide->getStatusCode());

        $inverted = $this->listAs('admin', ['from' => '2026-10-05', 'to' => '2026-09-01']);
        $this->assertSame(422, $inverted->getStatusCode());
    }

    public function test_exactly_the_maximum_range_is_accepted(): void
    {
        $r = $this->listAs('admin', ['from' => now()->subDays(180)->toDateString(), 'to' => now()->toDateString()]);
        $this->assertSame(200, $r->getStatusCode());
    }

    public function test_pagination_reports_whether_there_is_another_page_without_a_count(): void
    {
        $svc = new ClinicalAuditService();
        for ($i = 0; $i < ClinicalAuditService::PAGE_SIZE + 5; $i++) {
            $svc->record(self::BIZ, self::CLIENT, 'user-1', 'created', 'intake');
        }

        $p1 = json_decode($this->listAs('admin')->getContent(), true);
        $this->assertCount(ClinicalAuditService::PAGE_SIZE, $p1['rows']);
        $this->assertTrue($p1['has_more']);

        $p2 = json_decode($this->listAs('admin', ['page' => 2])->getContent(), true);
        $this->assertCount(5, $p2['rows']);
        $this->assertFalse($p2['has_more']);
        $this->assertEmpty(array_intersect(array_column($p1['rows'], 'id'), array_column($p2['rows'], 'id')));
    }

    public function test_service_list_uses_the_given_today_for_range_defaults(): void
    {
        $out = (new ClinicalAuditService())->list(self::BIZ, [], CarbonImmutable::parse('2026-10-05'));
        $this->assertSame('2026-10-05', $out['to']);
        $this->assertSame('2026-09-05', $out['from']);
    }
}
