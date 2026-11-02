<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\ServiceHistoryController;
use App\Services\ServiceHistoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/**
 * Historial de servicios por servicio: a quién se le hizo keratina, balayage… y desde cuándo. SQLite en memoria.
 */
class ServiceHistoryTest extends TestCase
{
    private const BIZ = '11111111-1111-4111-8111-111111111111';
    private const OTHER = '22222222-2222-4222-8222-222222222222';

    private int $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();

        // 2 de noviembre de 2026, mediodía en Caracas (UTC-4)
        Carbon::setTestNow('2026-11-02 16:00:00');

        Schema::dropAllTables();
        Schema::create('businesses', function ($t) {
            $t->string('id')->primary();
            $t->string('timezone')->nullable();
        });
        Schema::create('clients', function ($t) {
            $t->string('id')->primary();
            $t->string('full_name')->nullable();
            $t->string('phone')->nullable();
        });
        Schema::create('profiles', function ($t) {
            $t->string('id')->primary();
            $t->string('full_name')->nullable();
        });
        Schema::create('services', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('name');
            $t->string('category')->nullable();
        });
        Schema::create('appointments', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('branch_id')->nullable();
            $t->string('client_id')->nullable();
            $t->string('employee_id')->nullable();
            $t->string('service_id');
            $t->string('group_id')->nullable();
            $t->string('status')->default('completed');
            $t->string('payment_status')->default('unpaid');
            $t->dateTime('start_time');
        });
        Schema::create('transactions', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('appointment_id')->nullable();
            $t->string('method');
            $t->dateTime('created_at')->nullable();
        });

        DB::table('businesses')->insert([
            ['id' => self::BIZ, 'timezone' => 'America/Caracas'],
            ['id' => self::OTHER, 'timezone' => 'America/Caracas'],
        ]);
        DB::table('clients')->insert([
            ['id' => 'c-ana', 'full_name' => 'ANA PÉREZ', 'phone' => '0414-1'],
            ['id' => 'c-belen', 'full_name' => 'BELÉN RUIZ', 'phone' => '0414-2'],
            ['id' => 'c-otra', 'full_name' => 'OTRA DEL OTRO NEGOCIO', 'phone' => '0414-9'],
        ]);
        DB::table('profiles')->insert([
            ['id' => 'e-kelly', 'full_name' => 'Kelly Soler'],
            ['id' => 'e-mary', 'full_name' => 'Mary Peña'],
        ]);
        DB::table('services')->insert([
            ['id' => 's-bal', 'business_id' => self::BIZ, 'name' => 'Balayage', 'category' => 'Color'],
            ['id' => 's-ker', 'business_id' => self::BIZ, 'name' => 'Keratina', 'category' => 'Tratamientos'],
            ['id' => 's-tinte', 'business_id' => self::BIZ, 'name' => 'Tinte raíz', 'category' => 'Color'],
            ['id' => 's-man', 'business_id' => self::BIZ, 'name' => 'Manicure', 'category' => 'Uñas'],
            ['id' => 's-otro', 'business_id' => self::OTHER, 'name' => 'Balayage', 'category' => 'Color'],
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    // ── Utilidades ───────────────────────────────────────────────────────────

    private function appt(string $service, ?string $client, string $at, array $over = []): string
    {
        $id = 'a-'.(++$this->seq);
        DB::table('appointments')->insert(array_merge([
            'id' => $id,
            'business_id' => self::BIZ,
            'client_id' => $client,
            'employee_id' => 'e-kelly',
            'service_id' => $service,
            'group_id' => null,
            'status' => 'completed',
            'payment_status' => 'unpaid',
            'start_time' => $at,
        ], $over));

        return $id;
    }

    private function tx(string $appointmentId, string $method, string $at = '2026-10-01 12:00:00'): void
    {
        DB::table('transactions')->insert(['id' => 'tx-'.(++$this->seq), 'business_id' => self::BIZ, 'appointment_id' => $appointmentId, 'method' => $method, 'created_at' => $at]);
    }

    private function seedScenario(): void
    {
        // Ana: balayage hecho dos veces (una completada, otra pagada aunque quedó «confirmada»), y una keratina en la
        // misma visita que su segundo balayage.
        $this->appt('s-bal', 'c-ana', '2026-10-01 15:00:00');
        $second = $this->appt('s-bal', 'c-ana', '2026-10-20 15:00:00', ['status' => 'confirmed', 'payment_status' => 'paid', 'employee_id' => 'e-mary', 'group_id' => 'g-ana']);
        $this->appt('s-ker', 'c-ana', '2026-10-20 15:00:00', ['group_id' => 'g-ana']);
        $this->tx($second, 'cash');

        // Belén: balayage a crédito y luego cobrado con un abono (otra transacción de la misma cita)
        $belen = $this->appt('s-bal', 'c-belen', '2026-10-15 16:00:00');
        $this->tx($belen, 'credito', '2026-10-15 12:00:00');
        $this->tx($belen, 'cash', '2026-10-28 12:00:00');

        // Una sin clienta registrada, cobrada como cortesía
        $courtesy = $this->appt('s-bal', null, '2026-10-25 16:00:00');
        $this->tx($courtesy, 'cortesia');

        // Ruido que NO debe contar
        $this->appt('s-bal', 'c-ana', '2026-10-05 15:00:00', ['status' => 'cancelled']);
        $this->appt('s-bal', 'c-ana', '2026-10-06 15:00:00', ['status' => 'no_show']);
        $this->appt('s-bal', 'c-belen', '2026-10-07 15:00:00', ['status' => 'confirmed', 'payment_status' => 'unpaid']);
        $this->appt('s-bal', 'c-belen', '2026-10-08 15:00:00', ['status' => 'pending', 'payment_status' => 'unpaid']);
        $this->appt('s-otro', 'c-otra', '2026-10-12 15:00:00', ['business_id' => self::OTHER]);
        $this->appt('s-bal', 'c-belen', '2026-04-01 15:00:00'); // fuera de los 90 días por defecto
    }

    private function range(?string $start = null, ?string $end = null): array
    {
        return app(ServiceHistoryService::class)->resolveRange(self::BIZ, $start, $end);
    }

    private function byClient(array $filters = [], ?array $range = null): array
    {
        return app(ServiceHistoryService::class)->byClient(self::BIZ, $filters, $range ?? $this->range());
    }

    private function detail(string $clientId, array $filters = [], ?array $range = null): array
    {
        return app(ServiceHistoryService::class)->clientServices(self::BIZ, $clientId, $filters, $range ?? $this->range());
    }

    private function clients(array $result): array
    {
        return collect($result['clients'])->keyBy(fn ($c) => $c['client_id'] ?? 'none')->all();
    }

    // ── Por clienta ──────────────────────────────────────────────────────────

    public function test_groups_who_got_the_service_with_times_first_and_last(): void
    {
        $this->seedScenario();

        $result = $this->byClient(['q' => 'balayage']);
        $clients = $this->clients($result);

        $this->assertSame(['c-ana', 'c-belen', 'none'], array_keys($clients));
        $this->assertSame(2, $clients['c-ana']['visits']);
        $this->assertSame('ANA PÉREZ', $clients['c-ana']['client_name']);
        $this->assertSame('0414-1', $clients['c-ana']['client_phone']);
        $this->assertStringStartsWith('2026-10-01', $clients['c-ana']['first_at']);
        $this->assertStringStartsWith('2026-10-20', $clients['c-ana']['last_at']);
        $this->assertSame(1, $clients['c-belen']['visits']);
    }

    public function test_only_performed_services_count(): void
    {
        $this->seedScenario();

        $clients = $this->clients($this->byClient(['q' => 'balayage']));

        // Ana tiene 4 balayage en la agenda, pero solo 2 se hicieron (la cancelada y la no-show no cuentan).
        $this->assertSame(2, $clients['c-ana']['visits']);
        // Belén: solo el cobrado a crédito; la confirmada sin cobrar y la pendiente no se hicieron todavía.
        $this->assertSame(1, $clients['c-belen']['visits']);
    }

    public function test_a_paid_appointment_counts_even_if_its_status_is_not_completed(): void
    {
        $this->appt('s-bal', 'c-ana', '2026-10-20 15:00:00', ['status' => 'confirmed', 'payment_status' => 'paid']);

        $this->assertSame(1, $this->byClient(['q' => 'balayage'])['summary']['visits']);
    }

    public function test_a_cancelled_appointment_never_counts_even_if_it_says_paid(): void
    {
        $this->appt('s-bal', 'c-ana', '2026-10-20 15:00:00', ['status' => 'cancelled', 'payment_status' => 'paid']);
        $this->appt('s-bal', 'c-ana', '2026-10-21 15:00:00', ['status' => 'no_show', 'payment_status' => 'paid']);

        $this->assertSame(0, $this->byClient(['q' => 'balayage'])['summary']['visits']);
    }

    public function test_sales_without_a_client_are_grouped_together_and_always_last(): void
    {
        $this->seedScenario();

        $result = $this->byClient(['q' => 'balayage']);

        // La sin clienta es la más reciente (25/10) y aun así va al final.
        $this->assertNull(end($result['clients'])['client_id']);
        $this->assertSame(1, $result['summary']['anonymous_visits']);
    }

    public function test_the_summary_says_how_many_clients_and_visits_and_since_when(): void
    {
        $this->seedScenario();

        $summary = $this->byClient(['q' => 'balayage'])['summary'];

        $this->assertSame(2, $summary['clients']);   // Ana y Belén (la sin clienta no cuenta como persona)
        $this->assertSame(4, $summary['visits']);    // Ana ×2, Belén, la anónima
        $this->assertStringStartsWith('2026-10-01', $summary['first_at']);
        $this->assertStringStartsWith('2026-10-25', $summary['last_at']);
    }

    public function test_two_services_in_the_same_visit_count_as_one_visit_when_searching_both(): void
    {
        $this->seedScenario();

        // Buscar por la categoría «Color» y «Tratamientos» no mezcla: pero sin filtro, el balayage y la keratina del
        // 20/10 son UNA visita de Ana.
        $clients = $this->clients($this->byClient());

        $this->assertSame(2, $clients['c-ana']['visits'], 'el 1/10 y el 20/10 (balayage + keratina juntos) = 2 visitas');
    }

    public function test_the_service_search_matches_name_and_category_and_ignores_case(): void
    {
        $this->seedScenario();

        $this->assertSame(['c-ana', 'c-belen', null], array_column($this->byClient(['q' => 'BALAYAGE'])['clients'], 'client_id'));
        // Por categoría: «color» incluye balayage; «tratamientos» solo la keratina de Ana
        $this->assertSame(['c-ana'], array_column($this->byClient(['q' => 'tratamientos'])['clients'], 'client_id'));
        $this->assertSame(['c-ana'], array_column($this->byClient(['q' => 'kerat'])['clients'], 'client_id'));
    }

    public function test_search_wildcards_typed_by_the_user_are_not_wildcards(): void
    {
        $this->seedScenario();

        $this->assertSame([], $this->byClient(['q' => '%'])['clients']);
        $this->assertSame([], $this->byClient(['q' => '_'])['clients']);
        $this->assertSame([], $this->byClient(['q' => 'ba_ayage'])['clients']);
    }

    public function test_a_search_can_be_narrowed_to_one_service(): void
    {
        $this->seedScenario();

        $result = $this->byClient(['q' => 'color', 'service_id' => 's-bal']);

        $this->assertSame(['c-ana', 'c-belen', null], array_column($result['clients'], 'client_id'));
        $this->assertSame(4, $result['summary']['visits']);
    }

    public function test_narrowing_to_one_service_keeps_the_other_options_so_you_can_go_back(): void
    {
        $this->appt('s-bal', 'c-ana', '2026-10-10 15:00:00');
        $this->appt('s-tinte', 'c-belen', '2026-10-11 15:00:00');

        $all = $this->byClient(['q' => 'color']);
        $narrowed = $this->byClient(['q' => 'color', 'service_id' => 's-tinte']);

        $this->assertSame(['c-belen'], array_column($narrowed['clients'], 'client_id'));
        $this->assertSame(array_column($all['services'], 'service_id'), array_column($narrowed['services'], 'service_id'));
        $this->assertCount(2, $narrowed['services']);
    }

    public function test_it_lists_the_matching_services_most_done_first(): void
    {
        $this->seedScenario();

        $services = $this->byClient(['q' => 'color'])['services'];

        $this->assertSame(['s-bal'], array_column($services, 'service_id'));
        $this->assertSame(4, $services[0]['visits']);
        $this->assertSame(2, $services[0]['clients']);
    }

    public function test_only_this_business_services_and_appointments_count(): void
    {
        $this->seedScenario();

        $clients = $this->clients($this->byClient(['q' => 'balayage']));

        $this->assertArrayNotHasKey('c-otra', $clients);
    }

    public function test_an_appointment_of_another_business_never_counts_even_if_it_points_at_this_services_row(): void
    {
        // Dato inconsistente a propósito: el filtro de negocio de la PROPIA cita tiene que bastar para excluirla.
        $this->appt('s-bal', 'c-otra', '2026-10-12 15:00:00', ['business_id' => self::OTHER]);
        $this->appt('s-bal', 'c-ana', '2026-10-13 15:00:00');

        $this->assertSame(['c-ana'], array_column($this->byClient(['q' => 'balayage'])['clients'], 'client_id'));
    }

    // ── Rango de fechas ──────────────────────────────────────────────────────

    public function test_by_default_it_looks_at_the_last_90_days(): void
    {
        $this->seedScenario();

        $range = $this->range();

        $this->assertSame('2026-11-02', $range['end']);
        $this->assertSame('2026-08-05', $range['start']);
        $this->assertSame(1, $this->clients($this->byClient(['q' => 'balayage']))['c-belen']['visits'], 'la de abril queda fuera');
    }

    public function test_a_wider_range_reaches_older_services(): void
    {
        $this->seedScenario();

        $result = $this->byClient(['q' => 'balayage'], $this->range('2026-01-01', '2026-11-02'));
        $belen = $this->clients($result)['c-belen'];

        $this->assertSame(2, $belen['visits']);
        $this->assertStringStartsWith('2026-04-01', $belen['first_at']);
        $this->assertStringStartsWith('2026-04-01', $result['summary']['first_at']);
    }

    public function test_the_range_uses_the_business_day_not_utc(): void
    {
        // 02:00 UTC del 1/11 = 22:00 del 31/10 en Caracas: pertenece al 31/10.
        $this->appt('s-bal', 'c-ana', '2026-11-01 02:00:00');

        $this->assertCount(1, $this->byClient(['q' => 'balayage'], $this->range('2026-10-31', '2026-10-31'))['clients']);
        $this->assertCount(0, $this->byClient(['q' => 'balayage'], $this->range('2026-11-01', '2026-11-01'))['clients']);
    }

    public function test_an_inverted_range_is_rejected(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->range('2026-10-10', '2026-10-01');
    }

    public function test_the_range_cannot_exceed_twelve_months(): void
    {
        $this->assertSame('2025-11-02', $this->range('2025-11-02', '2026-11-02')['start']);

        $this->expectException(\InvalidArgumentException::class);
        $this->range('2025-10-01', '2026-11-02');
    }

    // ── Detalle de una clienta ───────────────────────────────────────────────

    public function test_the_detail_lists_one_clients_services_newest_first_with_who_did_them(): void
    {
        $this->seedScenario();

        $visits = $this->detail('c-ana', ['q' => 'balayage'])['visits'];

        $this->assertCount(2, $visits);
        $this->assertStringStartsWith('2026-10-20', $visits[0]['date']);
        $this->assertSame('Balayage', $visits[0]['service_name']);
        $this->assertSame('Mary Peña', $visits[0]['employee_name']);
        $this->assertSame('Kelly Soler', $visits[1]['employee_name']);
        $this->assertSame('cash', $visits[0]['payment_method']);
    }

    public function test_a_credit_service_is_marked_and_not_duplicated_by_a_later_abono(): void
    {
        $this->seedScenario();

        $visits = $this->detail('c-belen', ['q' => 'balayage'])['visits'];

        $this->assertCount(1, $visits, 'el abono posterior (otra transacción de la cita) no duplica el servicio');
        $this->assertSame('credito', $visits[0]['payment_method']);
        $this->assertTrue($visits[0]['is_credit']);
        $this->assertFalse($visits[0]['is_courtesy']);
    }

    public function test_a_courtesy_is_marked_and_the_no_client_visits_can_be_requested(): void
    {
        $this->seedScenario();

        $visits = $this->detail(ServiceHistoryService::NO_CLIENT, ['q' => 'balayage'])['visits'];

        $this->assertCount(1, $visits);
        $this->assertTrue($visits[0]['is_courtesy']);
        $this->assertSame('Kelly Soler', $visits[0]['employee_name']);
    }

    public function test_the_detail_does_not_leak_other_businesses_or_clients(): void
    {
        $this->seedScenario();

        $this->assertSame([], $this->detail('c-otra', ['q' => 'balayage'])['visits']);
        $this->assertCount(1, $this->detail('c-ana', ['q' => 'kerat'])['visits']);
    }

    public function test_a_paid_service_without_a_transaction_counts_as_paid(): void
    {
        $this->appt('s-man', 'c-ana', '2026-10-30 15:00:00');

        $visit = $this->detail('c-ana', ['q' => 'manicure'])['visits'][0];

        $this->assertSame('cash', $visit['payment_method']);
        $this->assertFalse($visit['is_credit']);
    }

    // ── Orden y páginas ──────────────────────────────────────────────────────

    public function test_sorting_by_times_and_by_name(): void
    {
        $this->seedScenario();

        $this->assertSame(['c-ana', 'c-belen'], array_slice(array_column($this->byClient(['q' => 'balayage', 'sort' => 'times'])['clients'], 'client_id'), 0, 2));
        $this->assertSame(['c-ana', 'c-belen'], array_slice(array_column($this->byClient(['q' => 'balayage', 'sort' => 'name'])['clients'], 'client_id'), 0, 2));
        $this->assertSame('c-ana', $this->byClient(['q' => 'balayage', 'sort' => 'recent'])['clients'][0]['client_id']);
    }

    public function test_results_are_paginated_without_a_count(): void
    {
        for ($i = 1; $i <= 30; $i++) {
            DB::table('clients')->insert(['id' => sprintf('c-%02d', $i), 'full_name' => "CLIENTA $i", 'phone' => null]);
            $this->appt('s-bal', sprintf('c-%02d', $i), '2026-10-'.sprintf('%02d', min($i, 28)).' 15:00:00');
        }

        $first = $this->byClient(['q' => 'balayage', 'page' => 1]);
        $second = $this->byClient(['q' => 'balayage', 'page' => 2]);

        $this->assertCount(25, $first['clients']);
        $this->assertTrue($first['has_more']);
        $this->assertCount(5, $second['clients']);
        $this->assertFalse($second['has_more']);
        $this->assertSame([], array_intersect(array_column($first['clients'], 'client_id'), array_column($second['clients'], 'client_id')));
        $this->assertSame(30, $first['summary']['clients'], 'el resumen cuenta todas, no solo la página');
    }

    public function test_the_detail_is_paginated_too(): void
    {
        for ($i = 1; $i <= 27; $i++) {
            $this->appt('s-bal', 'c-ana', '2026-10-01 15:00:00');
        }

        $this->assertCount(25, $this->detail('c-ana', ['q' => 'balayage', 'page' => 1])['visits']);
        $this->assertTrue($this->detail('c-ana', ['q' => 'balayage', 'page' => 1])['has_more']);
        $this->assertCount(2, $this->detail('c-ana', ['q' => 'balayage', 'page' => 2])['visits']);
    }

    public function test_the_branch_filter_keeps_services_without_branch_and_from_that_branch(): void
    {
        $b1 = '33333333-3333-4333-8333-333333333333';
        $b2 = '44444444-4444-4444-8444-444444444444';
        $this->appt('s-bal', 'c-ana', '2026-10-10 15:00:00', ['branch_id' => $b1]);
        $this->appt('s-bal', 'c-belen', '2026-10-11 15:00:00', ['branch_id' => $b2]);
        $this->appt('s-bal', 'c-ana', '2026-10-12 15:00:00', ['branch_id' => null]);

        $result = $this->byClient(['q' => 'balayage', 'branch_id' => $b1]);

        $this->assertSame(['c-ana'], array_column($result['clients'], 'client_id'));
        $this->assertSame(2, $result['clients'][0]['visits']);
    }

    public function test_nothing_found_returns_empty_lists_not_errors(): void
    {
        $result = $this->byClient(['q' => 'pedicure']);

        $this->assertSame([], $result['clients']);
        $this->assertSame([], $result['services']);
        $this->assertSame(0, $result['summary']['clients']);
        $this->assertNull($result['summary']['first_at']);
        $this->assertFalse($result['has_more']);
    }

    // ── Controlador y rutas ──────────────────────────────────────────────────

    private function callController(string $method, array $query, ?string $clientId = null): \Illuminate\Http\JsonResponse
    {
        $request = Request::create('/x', 'GET', array_merge(['business_id' => self::BIZ], $query));
        $controller = app(ServiceHistoryController::class);

        return $clientId === null ? $controller->$method($request) : $controller->$method($request, $clientId);
    }

    public function test_the_controller_returns_the_history_and_rejects_bad_ranges_with_422(): void
    {
        $this->seedScenario();

        $ok = $this->callController('index', ['q' => 'balayage']);
        $this->assertSame(200, $ok->getStatusCode());
        $this->assertSame('c-ana', json_decode($ok->getContent(), true)['clients'][0]['client_id']);

        $tooWide = $this->callController('index', ['start' => '2024-01-01', 'end' => '2026-11-02']);
        $this->assertSame(422, $tooWide->getStatusCode());
        $this->assertStringContainsString('12 meses', json_decode($tooWide->getContent(), true)['message']);

        $this->assertSame(422, $this->callController('index', ['start' => '2026-10-10', 'end' => '2026-10-01'])->getStatusCode());
    }

    public function test_the_controller_validates_its_inputs(): void
    {
        $this->expectException(ValidationException::class);
        $this->callController('index', ['sort' => 'inventado']);
    }

    public function test_the_controller_rejects_a_malformed_client_id_and_accepts_none(): void
    {
        $this->seedScenario();

        $this->assertSame(422, $this->callController('clientServices', ['q' => 'balayage'], "x' OR '1'='1")->getStatusCode());
        $this->assertSame(200, $this->callController('clientServices', ['q' => 'balayage'], 'none')->getStatusCode());
        $this->assertSame(200, $this->callController('clientServices', ['q' => 'balayage'], 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')->getStatusCode());
    }

    public function test_the_routes_are_admin_only_and_come_before_the_service_id_route(): void
    {
        $routes = collect(Route::getRoutes()->getRoutes())->filter(fn ($r) => in_array('GET', $r->methods(), true) && str_starts_with($r->uri(), 'api/services'))->values();
        $uris = $routes->map->uri()->all();

        foreach (['api/services/history', 'api/services/history/client/{clientId}'] as $uri) {
            $route = $routes->first(fn ($r) => $r->uri() === $uri);
            $this->assertNotNull($route, "falta la ruta $uri");
            $this->assertStringContainsString('ServiceHistoryController', $route->getActionName());

            $middleware = $route->gatherMiddleware();
            $this->assertContains('feature:servicios', $middleware, "$uri sin feature:servicios");
            $this->assertContains('admin-panel', $middleware, "$uri sin admin-panel: un empleado vería clientas y teléfonos");
            $this->assertNotEmpty(array_filter($middleware, fn ($m) => str_starts_with((string) $m, 'auth')), "$uri sin autenticación");
        }

        // /services/history no puede quedar detrás de /services/{id}, que lo tomaría por un id.
        $this->assertLessThan(array_search('api/services/{id}', $uris, true), array_search('api/services/history', $uris, true));
    }
}
