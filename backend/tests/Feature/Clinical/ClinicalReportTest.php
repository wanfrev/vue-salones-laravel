<?php

namespace Tests\Feature\Clinical;

use App\Http\Controllers\Api\Clinical\ReportController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ClinicalReportTest extends TestCase
{
    use BuildsClinicalSchema;

    private const BIZ = 'biz-1';

    protected function setUp(): void
    {
        parent::setUp();
        $this->buildClinicalSchema();

        DB::table('clients')->insert([
            ['id' => 'ana', 'business_id' => self::BIZ, 'full_name' => 'Ana Pérez'],
            ['id' => 'beto', 'business_id' => self::BIZ, 'full_name' => 'Beto Ruiz'],
            ['id' => 'ajeno', 'business_id' => 'biz-2', 'full_name' => 'Otro'],
        ]);
        DB::table('services')->insert(['id' => 'sv', 'name' => 'Psicoterapia individual']);

        $rows = [
            ['ap-1', 'biz-1', 'ana', '2026-09-02 09:00:00', 'completed'],
            ['ap-2', 'biz-1', 'ana', '2026-09-16 09:00:00', 'completed'],
            ['ap-3', 'biz-1', 'ana', '2026-09-23 09:00:00', 'no_show'],
            ['ap-4', 'biz-1', 'ana', '2026-09-30 09:00:00', 'cancelled'],
            ['ap-5', 'biz-1', 'ana', '2026-10-01 18:30:00', 'completed'],   // último día, tarde
            ['ap-6', 'biz-1', 'ana', '2026-07-01 09:00:00', 'completed'],   // fuera de rango
            ['ap-7', 'biz-1', 'beto', '2026-09-10 09:00:00', 'completed'],  // otro paciente
            ['ap-8', 'biz-2', 'ana', '2026-09-10 09:00:00', 'completed'],   // otro negocio, mismo id de paciente
        ];
        foreach ($rows as [$id, $biz, $client, $when, $status]) {
            DB::table('appointments')->insert(['id' => $id, 'business_id' => $biz, 'client_id' => $client, 'service_id' => 'sv', 'start_time' => $when, 'status' => $status]);
        }
    }

    private function req(string $role, string $method = 'GET', array $query = [], array $body = [], bool $flag = true): Request
    {
        $request = Request::create('/api/x', $method, $query, [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'], json_encode($body));
        $request->setUserResolver(fn () => (object) [
            'id' => 'u1',
            'profile' => (object) ['id' => 'u1', 'role' => $role, 'business_id' => self::BIZ, 'can_access_dental_clinical' => $flag],
        ]);

        return $request;
    }

    private function attendance(array $query, string $client = 'ana', string $role = 'empleado')
    {
        return app(ReportController::class)->attendance($this->req($role, 'GET', $query), $client);
    }

    public function test_attendance_lists_only_attended_sessions_in_range_oldest_first(): void
    {
        $r = $this->attendance(['from' => '2026-09-01', 'to' => '2026-10-01']);

        $this->assertSame(200, $r->getStatusCode());
        $rows = json_decode($r->getContent(), true);
        $this->assertSame(['ap-1', 'ap-2', 'ap-5'], array_column($rows, 'id')); // sin no_show/cancelled/otros
        $this->assertSame('Psicoterapia individual', $rows[0]['service_name']);
        $this->assertStringContainsString('2026-09-02', $rows[0]['start_time']);
    }

    public function test_the_last_day_of_the_range_is_inclusive_through_the_evening(): void
    {
        $ids = array_column(json_decode($this->attendance(['from' => '2026-10-01', 'to' => '2026-10-01'])->getContent(), true), 'id');
        $this->assertSame(['ap-5'], $ids);
    }

    public function test_attendance_never_crosses_business_or_patient(): void
    {
        $beto = json_decode($this->attendance(['from' => '2026-01-01', 'to' => '2026-12-31'], 'beto')->getContent(), true);
        $this->assertSame(['ap-7'], array_column($beto, 'id'));
        $ana = array_column(json_decode($this->attendance(['from' => '2026-01-01', 'to' => '2026-12-31'])->getContent(), true), 'id');
        $this->assertNotContains('ap-8', $ana);
    }

    public function test_attendance_validation_and_range_limits(): void
    {
        $this->assertSame(422, $this->attendance(['from' => '2026-10-05', 'to' => '2026-09-01'])->getStatusCode());
        $this->assertSame(422, $this->attendance(['from' => '2024-01-01', 'to' => '2026-10-01'])->getStatusCode());

        foreach ([[], ['from' => '2026-09-01'], ['from' => '01/09/2026', 'to' => '2026-10-01']] as $bad) {
            try {
                $this->attendance($bad);
                $this->fail('Debió fallar la validación.');
            } catch (ValidationException $e) {
                $this->assertNotEmpty($e->errors());
            }
        }
    }

    public function test_attendance_requires_clinical_access_and_a_patient_of_this_business(): void
    {
        $this->assertSame(403, $this->attendance(['from' => '2026-09-01', 'to' => '2026-10-01'], 'ana', 'cajero')->getStatusCode());
        $this->assertSame(404, $this->attendance(['from' => '2026-09-01', 'to' => '2026-10-01'], 'ajeno')->getStatusCode());
    }
}
