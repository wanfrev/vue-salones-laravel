<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\ClientItemHistoryController;
use App\Services\ClientItemHistoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/**
 * Qué clientas compraron o se hicieron «tinte» (producto Y servicio juntos), para el filtro del directorio de
 * Clientes: «lo compraron / se lo hicieron» y «no han vuelto desde hace N días». SQLite en memoria.
 */
class ClientItemHistoryTest extends TestCase
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
        Schema::create('products', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('name');
            $t->string('sku')->nullable();
        });
        Schema::create('product_variants', function ($t) {
            $t->string('id')->primary();
            $t->string('product_id');
            $t->string('name')->nullable();
            $t->string('sku')->nullable();
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
            $t->string('service_id');
            $t->string('group_id')->nullable();
            $t->string('status')->default('completed');
            $t->string('payment_status')->default('unpaid');
            $t->dateTime('start_time');
        });
        Schema::create('inventory_movements', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('branch_id')->nullable();
            $t->string('product_id');
            $t->string('variant_id')->nullable();
            $t->string('movement_type');
            $t->decimal('quantity', 12, 3);
            $t->string('reference_type')->nullable();
            $t->string('reference_id')->nullable();
            $t->string('client_id')->nullable();
            $t->dateTime('created_at')->nullable();
        });

        DB::table('businesses')->insert([
            ['id' => self::BIZ, 'timezone' => 'America/Caracas'],
            ['id' => self::OTHER, 'timezone' => 'America/Caracas'],
        ]);
        DB::table('products')->insert([
            ['id' => 'p-tinte', 'business_id' => self::BIZ, 'name' => 'Tinte Igora', 'sku' => 'TIN-71'],
            ['id' => 'p-shampoo', 'business_id' => self::BIZ, 'name' => 'Shampoo Matizador', 'sku' => 'SHA-1'],
            ['id' => 'p-otro', 'business_id' => self::OTHER, 'name' => 'Tinte Igora', 'sku' => 'TIN-71'],
        ]);
        DB::table('product_variants')->insert([
            ['id' => 'v-rubio', 'product_id' => 'p-tinte', 'name' => 'Rubio 7.1', 'sku' => 'IGO-71'],
        ]);
        DB::table('services')->insert([
            ['id' => 's-tinte', 'business_id' => self::BIZ, 'name' => 'Tinte raíz', 'category' => 'Color'],
            ['id' => 's-corte', 'business_id' => self::BIZ, 'name' => 'Corte', 'category' => 'Cabello'],
            ['id' => 's-otro', 'business_id' => self::OTHER, 'name' => 'Tinte raíz', 'category' => 'Color'],
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    // ── Utilidades ───────────────────────────────────────────────────────────

    private function sale(string $product, ?string $client, string $at, array $over = []): void
    {
        DB::table('inventory_movements')->insert(array_merge([
            'id' => 'm-'.(++$this->seq),
            'business_id' => self::BIZ,
            'product_id' => $product,
            'variant_id' => null,
            'movement_type' => 'sale',
            'quantity' => -1,
            'reference_type' => 'direct',
            'reference_id' => 'tx-'.$this->seq,
            'client_id' => $client,
            'created_at' => $at,
        ], $over));
    }

    private function service(string $service, ?string $client, string $at, array $over = []): string
    {
        $id = 'a-'.(++$this->seq);
        DB::table('appointments')->insert(array_merge([
            'id' => $id, 'business_id' => self::BIZ, 'client_id' => $client, 'service_id' => $service,
            'group_id' => null, 'status' => 'completed', 'payment_status' => 'unpaid', 'start_time' => $at,
        ], $over));

        return $id;
    }

    private function seedScenario(): void
    {
        // Ana: se hizo el servicio en septiembre y compró el producto en octubre → 2 veces, lo último fue el producto
        $this->service('s-tinte', 'c-ana', '2026-09-01 15:00:00');
        $this->sale('p-tinte', 'c-ana', '2026-10-01 15:00:00');

        // Belén: solo el servicio, hace meses (candidata a «no ha vuelto»)
        $this->service('s-tinte', 'c-belen', '2026-06-01 15:00:00');

        // Carla: producto vendido CON la cita (la clienta sale de la cita) y esa misma cita es el servicio → UNA visita
        $appt = $this->service('s-tinte', 'c-carla', '2026-10-15 15:00:00');
        $this->sale('p-tinte', null, '2026-10-15 15:00:00', ['reference_type' => 'appointment', 'reference_id' => $appt]);

        // Dani: en una visita con dos servicios (grupo) solo uno coincide con «tinte»
        $this->service('s-tinte', 'c-dani', '2026-10-20 15:00:00', ['group_id' => 'g-dani']);
        $this->service('s-corte', 'c-dani', '2026-10-20 15:00:00', ['group_id' => 'g-dani']);

        // Ruido que NO debe contar
        $this->service('s-tinte', 'c-eva', '2026-10-05 15:00:00', ['status' => 'cancelled']);
        $this->service('s-tinte', 'c-eva', '2026-10-06 15:00:00', ['status' => 'no_show']);
        $this->service('s-tinte', 'c-eva', '2026-10-07 15:00:00', ['status' => 'confirmed', 'payment_status' => 'unpaid']);
        $this->sale('p-tinte', null, '2026-10-25 15:00:00');                                  // venta sin clienta
        $this->service('s-tinte', null, '2026-10-26 15:00:00');                               // cita sin clienta
        $this->service('s-otro', 'c-otra', '2026-10-12 15:00:00', ['business_id' => self::OTHER]);
        $this->sale('p-otro', 'c-otra', '2026-10-12 15:00:00', ['business_id' => self::OTHER]);
        $this->service('s-tinte', 'c-fabi', '2025-01-10 15:00:00');                            // hace casi 2 años
        $this->sale('p-shampoo', 'c-ana', '2026-10-28 15:00:00');                              // otro producto
        $this->sale('p-tinte', 'c-gaby', '2026-10-02 15:00:00', ['movement_type' => 'purchase', 'quantity' => 5]); // compra de inventario
    }

    private function findMatches(string $q, array $filters = []): array
    {
        $svc = app(ClientItemHistoryService::class);

        return $svc->matches(self::BIZ, array_merge(['q' => $q], $filters), $svc->resolveRange(self::BIZ));
    }

    private function byClient(array $result): array
    {
        return collect($result['clients'])->keyBy('client_id')->all();
    }

    // ── Quién y cuándo ───────────────────────────────────────────────────────

    public function test_it_finds_who_bought_or_got_the_item_across_products_and_services(): void
    {
        $this->seedScenario();

        $clients = $this->byClient($this->findMatches('tinte'));

        $this->assertEqualsCanonicalizing(['c-ana', 'c-belen', 'c-carla', 'c-dani'], array_keys($clients));
    }

    public function test_it_gives_the_last_and_first_time_how_many_times_and_what_it_was(): void
    {
        $this->seedScenario();

        $ana = $this->byClient($this->findMatches('tinte'))['c-ana'];

        $this->assertStringStartsWith('2026-10-01', $ana['last_at']);
        $this->assertStringStartsWith('2026-09-01', $ana['first_at']);
        $this->assertSame(2, $ana['times']);
        $this->assertSame('Tinte Igora', $ana['last_item'], 'lo último fue el producto, no el servicio de septiembre');
    }

    public function test_a_product_sold_with_an_appointment_and_that_same_service_count_as_one_visit(): void
    {
        $this->seedScenario();

        $carla = $this->byClient($this->findMatches('tinte'))['c-carla'];

        $this->assertSame(1, $carla['times']);
    }

    public function test_one_visit_with_two_services_counts_once(): void
    {
        $this->seedScenario();

        // Buscando algo que coincide con los dos servicios de la visita de Dani (ambos tienen «o» en el nombre)
        $dani = $this->byClient($this->findMatches('o'))['c-dani'];

        $this->assertSame(1, $dani['times']);
    }

    public function test_the_last_item_is_the_most_recent_of_several_matching_things(): void
    {
        $this->service('s-tinte', 'c-ana', '2026-09-01 15:00:00');
        $this->sale('p-tinte', 'c-ana', '2026-09-20 15:00:00');
        $this->service('s-tinte', 'c-ana', '2026-10-10 15:00:00');

        $this->assertSame('Tinte raíz', $this->byClient($this->findMatches('tinte'))['c-ana']['last_item']);
    }

    public function test_most_recent_clients_come_first(): void
    {
        $this->seedScenario();

        $this->assertSame(['c-dani', 'c-carla', 'c-ana', 'c-belen'], array_column($this->findMatches('tinte')['clients'], 'client_id'));
    }

    // ── Qué no cuenta ────────────────────────────────────────────────────────

    public function test_only_realized_services_count(): void
    {
        $this->seedScenario();

        $this->assertArrayNotHasKey('c-eva', $this->byClient($this->findMatches('tinte')), 'cancelada, no-show y confirmada sin cobrar no cuentan');
    }

    public function test_a_cancelled_or_no_show_appointment_never_counts_even_if_it_says_paid(): void
    {
        $this->service('s-tinte', 'c-ana', '2026-10-10 15:00:00', ['status' => 'cancelled', 'payment_status' => 'paid']);
        $this->service('s-tinte', 'c-belen', '2026-10-11 15:00:00', ['status' => 'no_show', 'payment_status' => 'paid']);

        $this->assertSame([], $this->findMatches('tinte')['clients']);
    }

    public function test_a_paid_appointment_counts_even_if_its_status_is_not_completed(): void
    {
        $this->service('s-tinte', 'c-ana', '2026-10-10 15:00:00', ['status' => 'confirmed', 'payment_status' => 'paid']);

        $this->assertArrayHasKey('c-ana', $this->byClient($this->findMatches('tinte')));
    }

    public function test_sales_and_appointments_without_a_client_cannot_be_attributed_and_are_left_out(): void
    {
        $this->sale('p-tinte', null, '2026-10-25 15:00:00');
        $this->service('s-tinte', null, '2026-10-26 15:00:00');

        $this->assertSame([], $this->findMatches('tinte')['clients']);
    }

    public function test_inventory_purchases_other_products_other_businesses_and_old_sales_do_not_count(): void
    {
        $this->seedScenario();

        $clients = $this->byClient($this->findMatches('tinte'));

        $this->assertArrayNotHasKey('c-gaby', $clients, 'una compra de inventario no es una venta');
        $this->assertArrayNotHasKey('c-otra', $clients, 'otro negocio');
        $this->assertArrayNotHasKey('c-fabi', $clients, 'hace más de un año');
        $this->assertSame(2, $clients['c-ana']['times'], 'el champú de Ana no cuenta para «tinte»');
    }

    public function test_a_movement_of_another_business_never_counts_even_if_it_points_at_this_products_row(): void
    {
        // Dato inconsistente a propósito: el filtro de negocio del PROPIO movimiento tiene que bastar para excluirlo.
        $this->sale('p-tinte', 'c-otra', '2026-10-12 15:00:00', ['business_id' => self::OTHER]);
        $this->service('s-tinte', 'c-otra', '2026-10-12 15:00:00', ['business_id' => self::OTHER]);

        $this->assertSame([], $this->findMatches('tinte')['clients']);
    }

    // ── Búsqueda ─────────────────────────────────────────────────────────────

    public function test_the_search_matches_names_categories_skus_and_variants_ignoring_case(): void
    {
        $this->seedScenario();
        // Una venta con variante (color) de otra clienta, para buscar por el nombre y el SKU de la variante
        $this->sale('p-tinte', 'c-hilda', '2026-10-03 15:00:00', ['variant_id' => 'v-rubio']);

        $this->assertArrayHasKey('c-ana', $this->byClient($this->findMatches('TINTE')));
        $this->assertArrayHasKey('c-belen', $this->byClient($this->findMatches('color')), 'por la categoría del servicio');
        $this->assertArrayHasKey('c-ana', $this->byClient($this->findMatches('tin-71')), 'por el SKU del producto');
        $this->assertSame(['c-hilda'], array_keys($this->byClient($this->findMatches('igo-71'))), 'por el SKU de la variante');
        $this->assertSame(['c-hilda'], array_keys($this->byClient($this->findMatches('rubio'))), 'por el nombre de la variante');
    }

    public function test_search_wildcards_typed_by_the_user_are_not_wildcards(): void
    {
        $this->seedScenario();

        $this->assertSame([], $this->findMatches('%')['clients']);
        $this->assertSame([], $this->findMatches('_')['clients']);
        $this->assertSame([], $this->findMatches('ti_te')['clients']);
    }

    public function test_the_branch_filter_keeps_those_without_branch_and_from_that_branch(): void
    {
        $b1 = '33333333-3333-4333-8333-333333333333';
        $b2 = '44444444-4444-4444-8444-444444444444';
        $this->service('s-tinte', 'c-ana', '2026-10-10 15:00:00', ['branch_id' => $b1]);
        $this->service('s-tinte', 'c-belen', '2026-10-11 15:00:00', ['branch_id' => $b2]);
        $this->sale('p-tinte', 'c-carla', '2026-10-12 15:00:00', ['branch_id' => null]);

        $clients = $this->byClient($this->findMatches('tinte', ['branch_id' => $b1]));

        $this->assertEqualsCanonicalizing(['c-ana', 'c-carla'], array_keys($clients));
    }

    public function test_the_range_is_the_last_twelve_months_in_the_business_day(): void
    {
        $range = app(ClientItemHistoryService::class)->resolveRange(self::BIZ);

        $this->assertSame('2026-11-02', $range['end']);
        $this->assertSame('2025-11-03', $range['start']);
    }

    public function test_nothing_found_returns_an_empty_list_not_an_error(): void
    {
        $result = $this->findMatches('cartera');

        $this->assertSame([], $result['clients']);
        $this->assertFalse($result['truncated']);
    }

    public function test_it_is_capped_and_says_so_when_there_are_more(): void
    {
        $max = ClientItemHistoryService::MAX_CLIENTS;
        foreach (array_chunk(range(1, $max + 1), 100) as $chunk) {
            DB::table('appointments')->insert(array_map(fn ($i) => [
                'id' => "bulk-$i", 'business_id' => self::BIZ, 'branch_id' => null, 'client_id' => sprintf('c-%05d', $i), 'service_id' => 's-tinte',
                'group_id' => null, 'status' => 'completed', 'payment_status' => 'unpaid', 'start_time' => '2026-10-01 15:00:00',
            ], $chunk));
        }

        $result = $this->findMatches('tinte');

        $this->assertCount($max, $result['clients']);
        $this->assertTrue($result['truncated']);
    }

    // ── Controlador y ruta ───────────────────────────────────────────────────

    private function callIndex(array $query): \Illuminate\Http\JsonResponse
    {
        return app(ClientItemHistoryController::class)->index(Request::create('/x', 'GET', array_merge(['business_id' => self::BIZ], $query)));
    }

    public function test_the_controller_returns_the_matches(): void
    {
        $this->seedScenario();

        $response = $this->callIndex(['q' => 'tinte']);
        $body = json_decode($response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(['c-dani', 'c-carla', 'c-ana', 'c-belen'], array_column($body['clients'], 'client_id'));
        $this->assertSame('2025-11-03', $body['range']['start']);
    }

    public function test_the_controller_requires_at_least_two_letters(): void
    {
        $this->expectException(ValidationException::class);
        $this->callIndex(['q' => 'a']);
    }

    public function test_the_controller_requires_a_search_text(): void
    {
        $this->expectException(ValidationException::class);
        $this->callIndex([]);
    }

    public function test_the_route_is_admin_only_and_comes_before_the_client_id_route(): void
    {
        $routes = collect(Route::getRoutes()->getRoutes())->filter(fn ($r) => in_array('GET', $r->methods(), true) && str_starts_with($r->uri(), 'api/clients'))->values();
        $uris = $routes->map->uri()->all();
        $route = $routes->first(fn ($r) => $r->uri() === 'api/clients/by-item');

        $this->assertNotNull($route, 'falta la ruta api/clients/by-item');
        $this->assertStringContainsString('ClientItemHistoryController', $route->getActionName());

        $middleware = $route->gatherMiddleware();
        $this->assertContains('admin-panel', $middleware, 'sin admin-panel: un empleado vería quién compró qué');
        $this->assertNotEmpty(array_filter($middleware, fn ($m) => str_starts_with((string) $m, 'auth')), 'sin autenticación');

        // /clients/by-item no puede quedar detrás de /clients/{id}, que lo tomaría por un id.
        $this->assertLessThan(array_search('api/clients/{id}', $uris, true), array_search('api/clients/by-item', $uris, true));
    }
}
