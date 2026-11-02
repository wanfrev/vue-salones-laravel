<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\ProductSalesHistoryController;
use App\Services\ProductSalesHistoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/**
 * Historial de compras por producto: quién compró tinte, shampoo… y desde cuándo. SQLite en memoria.
 */
class ProductSalesHistoryTest extends TestCase
{
    private const BIZ = '11111111-1111-4111-8111-111111111111';
    private const OTHER = '22222222-2222-4222-8222-222222222222';

    private int $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();

        // Viernes 2 de noviembre de 2026 mediodía en Caracas (UTC-4)
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
        Schema::create('appointments', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('client_id')->nullable();
        });
        Schema::create('transactions', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('appointment_id')->nullable();
            $t->string('method');
            $t->dateTime('created_at')->nullable();
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
            $t->text('notes')->nullable();
            $t->string('client_id')->nullable();
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
        DB::table('products')->insert([
            ['id' => 'p-tinte', 'business_id' => self::BIZ, 'name' => 'Tinte Igora', 'sku' => 'TIN-71'],
            ['id' => 'p-tinte2', 'business_id' => self::BIZ, 'name' => 'Tinte Koleston', 'sku' => 'KOL-1'],
            ['id' => 'p-shampoo', 'business_id' => self::BIZ, 'name' => 'Shampoo Matizador', 'sku' => 'SHA-1'],
            ['id' => 'p-otro', 'business_id' => self::OTHER, 'name' => 'Tinte Igora', 'sku' => 'TIN-71'],
        ]);
        DB::table('product_variants')->insert([
            ['id' => 'v-rubio', 'product_id' => 'p-tinte', 'name' => 'Rubio 7.1', 'sku' => 'IGO-71'],
            ['id' => 'v-negro', 'product_id' => 'p-tinte', 'name' => 'Negro 1.0', 'sku' => 'IGO-10'],
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    // ── Utilidades ───────────────────────────────────────────────────────────

    private function sale(string $product, float $qty, string $at, array $over = []): void
    {
        DB::table('inventory_movements')->insert(array_merge([
            'id' => 'm-'.(++$this->seq),
            'business_id' => self::BIZ,
            'product_id' => $product,
            'variant_id' => null,
            'movement_type' => 'sale',
            'quantity' => -abs($qty),
            'reference_type' => 'direct',
            'reference_id' => 'tx-'.$this->seq,
            'client_id' => null,
            'created_at' => $at,
        ], $over));
    }

    private function tx(string $id, string $method, ?string $appointmentId = null, string $at = '2026-10-01 12:00:00', string $business = self::BIZ): void
    {
        DB::table('transactions')->insert(['id' => $id, 'business_id' => $business, 'appointment_id' => $appointmentId, 'method' => $method, 'created_at' => $at]);
    }

    /** El caso del negocio: Ana compra tinte dos veces, Belén por una cita (a crédito), una sin clienta (cortesía). */
    private function seedScenario(): void
    {
        // Ana: una compra con DOS líneas de tinte (misma venta) y otra con variante «Negro»
        $this->tx('tx-ana1', 'cash');
        $this->sale('p-tinte', 1, '2026-10-01 15:00:00', ['client_id' => 'c-ana', 'reference_id' => 'tx-ana1', 'variant_id' => 'v-rubio']);
        $this->sale('p-tinte2', 1, '2026-10-01 15:00:00', ['client_id' => 'c-ana', 'reference_id' => 'tx-ana1']);
        $this->tx('tx-ana2', 'cash');
        $this->sale('p-tinte', 2, '2026-10-20 15:00:00', ['client_id' => 'c-ana', 'reference_id' => 'tx-ana2', 'variant_id' => 'v-negro']);
        // Ana también compró shampoo (no debe aparecer al buscar «tinte»)
        $this->sale('p-shampoo', 1, '2026-10-10 15:00:00', ['client_id' => 'c-ana']);

        // Belén: producto vendido con una cita (la clienta sale de la cita, no del movimiento); la venta fue a crédito y
        // luego se cobró con un abono, que crea OTRA transacción de la misma cita.
        DB::table('appointments')->insert(['id' => 'appt-belen', 'business_id' => self::BIZ, 'client_id' => 'c-belen']);
        $this->tx('tx-belen-credito', 'credito', 'appt-belen', '2026-10-15 12:00:00');
        $this->tx('tx-belen-abono', 'cash', 'appt-belen', '2026-10-28 12:00:00');
        $this->sale('p-tinte', 1, '2026-10-15 16:00:00', ['reference_type' => 'appointment', 'reference_id' => 'appt-belen']);

        // Una sin clienta registrada, entregada como cortesía
        $this->tx('tx-cortesia', 'cortesia');
        $this->sale('p-tinte', 1, '2026-10-25 16:00:00', ['reference_id' => 'tx-cortesia']);

        // Ruido que NO debe contar: una compra de inventario, otro negocio y una venta vieja fuera de los 90 días
        $this->sale('p-tinte', 5, '2026-10-02 15:00:00', ['movement_type' => 'purchase', 'quantity' => 5, 'client_id' => 'c-ana']);
        $this->sale('p-otro', 3, '2026-10-12 15:00:00', ['business_id' => self::OTHER, 'client_id' => 'c-otra']);
        $this->sale('p-tinte', 1, '2026-04-01 15:00:00', ['client_id' => 'c-belen']);
    }

    private function range(?string $start = null, ?string $end = null): array
    {
        return app(ProductSalesHistoryService::class)->resolveRange(self::BIZ, $start, $end);
    }

    private function byClient(array $filters = [], ?array $range = null): array
    {
        return app(ProductSalesHistoryService::class)->byClient(self::BIZ, $filters, $range ?? $this->range());
    }

    private function clients(array $result): array
    {
        return collect($result['clients'])->keyBy(fn ($c) => $c['client_id'] ?? 'none')->all();
    }

    // ── Por clienta ──────────────────────────────────────────────────────────

    public function test_groups_the_buyers_of_a_product_with_first_and_last_purchase(): void
    {
        $this->seedScenario();

        $result = $this->byClient(['q' => 'tinte']);
        $clients = $this->clients($result);

        $this->assertSame(['c-ana', 'c-belen', 'none'], array_keys($clients));

        // Ana: dos compras (la primera con dos líneas cuenta una), 4 unidades
        $this->assertSame(2, $clients['c-ana']['purchases']);
        $this->assertEquals(4.0, $clients['c-ana']['units']);
        $this->assertSame('ANA PÉREZ', $clients['c-ana']['client_name']);
        $this->assertStringStartsWith('2026-10-01', $clients['c-ana']['first_at']);
        $this->assertStringStartsWith('2026-10-20', $clients['c-ana']['last_at']);
    }

    public function test_the_client_of_a_product_sold_with_an_appointment_comes_from_the_appointment(): void
    {
        $this->seedScenario();

        $clients = $this->clients($this->byClient(['q' => 'tinte']));

        $this->assertSame('BELÉN RUIZ', $clients['c-belen']['client_name']);
        $this->assertSame(1, $clients['c-belen']['purchases']);
    }

    public function test_sales_without_a_client_are_grouped_together_and_always_last(): void
    {
        $this->seedScenario();

        $result = $this->byClient(['q' => 'tinte']);

        // La sin clienta es la más reciente (25/10) y aun así va al final.
        $this->assertNull(end($result['clients'])['client_id']);
        $this->assertSame(1, end($result['clients'])['purchases']);
        $this->assertSame(1, $result['summary']['anonymous_purchases']);
    }

    public function test_the_summary_says_how_many_buyers_purchases_and_since_when(): void
    {
        $this->seedScenario();

        $summary = $this->byClient(['q' => 'tinte'])['summary'];

        $this->assertSame(2, $summary['buyers']);            // Ana y Belén (la sin clienta no cuenta como persona)
        $this->assertSame(4, $summary['purchases']);         // Ana ×2, Belén, la anónima
        $this->assertEquals(6.0, $summary['units']);
        $this->assertStringStartsWith('2026-10-01', $summary['first_at']);
        $this->assertStringStartsWith('2026-10-25', $summary['last_at']);
    }

    public function test_the_product_search_matches_name_sku_and_variant_and_ignores_case(): void
    {
        $this->seedScenario();

        $this->assertCount(3, $this->byClient(['q' => 'TINTE'])['clients']);
        $this->assertCount(3, $this->byClient(['q' => 'tin-71'])['clients'], 'por SKU del producto');

        $byVariant = $this->byClient(['q' => 'negro']);
        $this->assertSame(['c-ana'], array_column($byVariant['clients'], 'client_id'), 'por nombre de variante');
        $this->assertEquals(2.0, $byVariant['clients'][0]['units']);

        $this->assertSame(['c-ana'], array_column($this->byClient(['q' => 'igo-10'])['clients'], 'client_id'), 'por SKU de variante');
        $this->assertSame(['c-ana'], array_column($this->byClient(['q' => 'shampoo'])['clients'], 'client_id'));
    }

    public function test_search_wildcards_typed_by_the_user_are_not_wildcards(): void
    {
        $this->seedScenario();

        $this->assertSame([], $this->byClient(['q' => '%'])['clients']);
        $this->assertSame([], $this->byClient(['q' => '_'])['clients']);
        $this->assertSame([], $this->byClient(['q' => 'ti_te'])['clients']);
    }

    public function test_a_search_can_be_narrowed_to_one_product(): void
    {
        $this->seedScenario();

        $result = $this->byClient(['q' => 'tinte', 'product_id' => 'p-tinte2']);

        $this->assertSame(['c-ana'], array_column($result['clients'], 'client_id'));
        $this->assertEquals(1.0, $result['summary']['units']);
    }

    public function test_narrowing_to_one_product_keeps_the_other_options_so_you_can_go_back(): void
    {
        $this->seedScenario();

        $all = $this->byClient(['q' => 'tinte']);
        $narrowed = $this->byClient(['q' => 'tinte', 'product_id' => 'p-tinte2']);

        // Los compradores y el resumen se acotan al producto elegido...
        $this->assertSame(['c-ana'], array_column($narrowed['clients'], 'client_id'));
        // ...pero la lista de productos de la búsqueda NO: si no, desaparecerían las opciones y no habría cómo volver a «Todos».
        $this->assertSame(array_column($all['products'], 'product_id'), array_column($narrowed['products'], 'product_id'));
        $this->assertEquals(array_column($all['products'], 'units'), array_column($narrowed['products'], 'units'));
    }

    public function test_it_lists_the_products_that_match_the_search_most_sold_first(): void
    {
        $this->seedScenario();

        $products = $this->byClient(['q' => 'tinte'])['products'];

        $this->assertSame(['p-tinte', 'p-tinte2'], array_column($products, 'product_id'));
        $this->assertEquals(5.0, $products[0]['units']);   // 1 + 2 + 1 + 1
        $this->assertSame(2, $products[0]['buyers']);
    }

    public function test_without_a_search_it_covers_every_product_sale(): void
    {
        $this->seedScenario();

        $result = $this->byClient();

        $this->assertEquals(7.0, $result['summary']['units']);   // tintes (6) + shampoo (1), sin compra de inventario ni el otro negocio
    }

    public function test_a_movement_of_another_business_never_counts_even_if_it_points_at_this_products_row(): void
    {
        // Dato inconsistente a propósito: el filtro de negocio del PROPIO movimiento tiene que bastar para excluirlo.
        $this->sale('p-tinte', 4, '2026-10-12 15:00:00', ['business_id' => self::OTHER, 'client_id' => 'c-otra']);
        $this->sale('p-tinte', 1, '2026-10-13 15:00:00', ['client_id' => 'c-ana']);

        $result = $this->byClient(['q' => 'tinte']);

        $this->assertSame(['c-ana'], array_column($result['clients'], 'client_id'));
        $this->assertEquals(1.0, $result['summary']['units']);
    }

    public function test_only_sales_count_not_purchases_or_adjustments_nor_other_businesses(): void
    {
        $this->seedScenario();

        $clients = $this->clients($this->byClient(['q' => 'tinte']));

        $this->assertEquals(4.0, $clients['c-ana']['units'], 'la compra de inventario de 5 unidades no cuenta');
        $this->assertArrayNotHasKey('c-otra', $clients, 'el otro negocio no se ve');
    }

    // ── Rango de fechas ──────────────────────────────────────────────────────

    public function test_by_default_it_looks_at_the_last_90_days(): void
    {
        $this->seedScenario();

        $range = $this->range();

        $this->assertSame('2026-11-02', $range['end']);
        $this->assertSame('2026-08-05', $range['start']);
        // La venta de abril queda fuera: Belén tiene solo la compra de la cita.
        $this->assertEquals(1.0, $this->clients($this->byClient(['q' => 'tinte']))['c-belen']['units']);
    }

    public function test_a_wider_range_reaches_older_sales(): void
    {
        $this->seedScenario();

        $result = $this->byClient(['q' => 'tinte'], $this->range('2026-01-01', '2026-11-02'));
        $belen = $this->clients($result)['c-belen'];

        $this->assertSame(2, $belen['purchases']);
        $this->assertStringStartsWith('2026-04-01', $belen['first_at'], 'la primera compra es la de abril');
        $this->assertStringStartsWith('2026-04-01', $result['summary']['first_at']);
    }

    public function test_the_range_uses_the_business_day_not_utc(): void
    {
        // 02:00 UTC del 1/11 = 22:00 del 31/10 en Caracas: pertenece al 31/10.
        $this->sale('p-tinte', 1, '2026-11-01 02:00:00', ['client_id' => 'c-ana', 'reference_id' => 'tx-x']);

        $this->assertCount(1, $this->byClient(['q' => 'tinte'], $this->range('2026-10-31', '2026-10-31'))['clients']);
        $this->assertCount(0, $this->byClient(['q' => 'tinte'], $this->range('2026-11-01', '2026-11-01'))['clients']);
    }

    public function test_an_invalid_range_is_rejected(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->range('2026-10-10', '2026-10-01');
    }

    public function test_the_range_cannot_exceed_twelve_months(): void
    {
        $this->assertSame('2025-11-02', $this->range('2025-11-02', '2026-11-02')['start'], '12 meses justos sí');

        $this->expectException(\InvalidArgumentException::class);
        $this->range('2025-10-01', '2026-11-02');
    }

    // ── Detalle de una clienta ───────────────────────────────────────────────

    private function detail(string $clientId, array $filters = [], ?array $range = null): array
    {
        return app(ProductSalesHistoryService::class)->clientSales(self::BIZ, $clientId, $filters, $range ?? $this->range());
    }

    public function test_the_detail_lists_one_clients_purchases_newest_first(): void
    {
        $this->seedScenario();

        $sales = $this->detail('c-ana', ['q' => 'tinte'])['sales'];

        $this->assertCount(3, $sales);
        $this->assertStringStartsWith('2026-10-20', $sales[0]['date']);
        $this->assertSame('Negro 1.0', $sales[0]['variant_name']);
        $this->assertEquals(2.0, $sales[0]['quantity']);
        $this->assertSame('cash', $sales[0]['payment_method']);
    }

    public function test_a_credit_sale_is_marked_and_not_duplicated_by_a_later_abono(): void
    {
        $this->seedScenario();

        $sales = $this->detail('c-belen', ['q' => 'tinte'])['sales'];

        $this->assertCount(1, $sales, 'el abono posterior (otra transacción de la cita) no duplica la venta');
        $this->assertSame('credito', $sales[0]['payment_method']);
        $this->assertTrue($sales[0]['is_credit']);
        $this->assertFalse($sales[0]['is_courtesy']);
    }

    public function test_a_courtesy_is_marked_and_the_no_client_sales_can_be_requested(): void
    {
        $this->seedScenario();

        $sales = $this->detail(ProductSalesHistoryService::NO_CLIENT, ['q' => 'tinte'])['sales'];

        $this->assertCount(1, $sales);
        $this->assertTrue($sales[0]['is_courtesy']);
        $this->assertFalse($sales[0]['is_credit']);
    }

    public function test_the_detail_of_a_client_does_not_leak_other_businesses_or_clients(): void
    {
        $this->seedScenario();

        $this->assertSame([], $this->detail('c-otra', ['q' => 'tinte'])['sales']);
        $this->assertCount(1, $this->detail('c-ana', ['q' => 'shampoo'])['sales']);
    }

    public function test_a_sale_without_a_transaction_counts_as_paid(): void
    {
        // Venta desde Inventario: sin transacción asociada
        $this->sale('p-tinte', 1, '2026-10-30 15:00:00', ['client_id' => 'c-ana', 'reference_type' => 'direct_sale', 'reference_id' => null]);

        $sale = $this->detail('c-ana', ['q' => 'tinte'])['sales'][0];

        $this->assertSame('cash', $sale['payment_method']);
        $this->assertFalse($sale['is_credit']);
    }

    // ── Orden y páginas ──────────────────────────────────────────────────────

    public function test_sorting_by_units_and_by_name(): void
    {
        $this->seedScenario();

        $this->assertSame(['c-ana', 'c-belen'], array_slice(array_column($this->byClient(['q' => 'tinte', 'sort' => 'units'])['clients'], 'client_id'), 0, 2));
        $this->assertSame(['c-ana', 'c-belen'], array_slice(array_column($this->byClient(['q' => 'tinte', 'sort' => 'name'])['clients'], 'client_id'), 0, 2), 'ANA antes que BELÉN');
        // Por fecha: gana la compra más reciente
        $this->assertSame('c-ana', $this->byClient(['q' => 'tinte', 'sort' => 'recent'])['clients'][0]['client_id']);
    }

    public function test_results_are_paginated_without_a_count(): void
    {
        for ($i = 1; $i <= 30; $i++) {
            $id = sprintf('c-%02d', $i);
            DB::table('clients')->insert(['id' => $id, 'full_name' => "CLIENTA $i", 'phone' => null]);
            $this->sale('p-tinte', 1, '2026-10-'.sprintf('%02d', min($i, 28)).' 15:00:00', ['client_id' => $id]);
        }

        $first = $this->byClient(['q' => 'tinte', 'page' => 1]);
        $second = $this->byClient(['q' => 'tinte', 'page' => 2]);

        $this->assertCount(25, $first['clients']);
        $this->assertTrue($first['has_more']);
        $this->assertCount(5, $second['clients']);
        $this->assertFalse($second['has_more']);
        $this->assertSame([], array_intersect(array_column($first['clients'], 'client_id'), array_column($second['clients'], 'client_id')), 'ninguna se repite entre páginas');
        $this->assertSame(30, $first['summary']['buyers'], 'el resumen cuenta todas, no solo la página');
    }

    public function test_the_detail_is_paginated_too(): void
    {
        for ($i = 1; $i <= 27; $i++) {
            $this->sale('p-tinte', 1, '2026-10-01 15:00:00', ['client_id' => 'c-ana']);
        }

        $this->assertCount(25, $this->detail('c-ana', ['q' => 'tinte', 'page' => 1])['sales']);
        $this->assertTrue($this->detail('c-ana', ['q' => 'tinte', 'page' => 1])['has_more']);
        $this->assertCount(2, $this->detail('c-ana', ['q' => 'tinte', 'page' => 2])['sales']);
    }

    public function test_the_branch_filter_keeps_sales_without_branch_and_from_that_branch(): void
    {
        $b1 = '33333333-3333-4333-8333-333333333333';
        $b2 = '44444444-4444-4444-8444-444444444444';
        $this->sale('p-tinte', 1, '2026-10-10 15:00:00', ['client_id' => 'c-ana', 'branch_id' => $b1]);
        $this->sale('p-tinte', 1, '2026-10-11 15:00:00', ['client_id' => 'c-belen', 'branch_id' => $b2]);
        $this->sale('p-tinte', 1, '2026-10-12 15:00:00', ['client_id' => 'c-ana', 'branch_id' => null]);

        $result = $this->byClient(['q' => 'tinte', 'branch_id' => $b1]);

        $this->assertSame(['c-ana'], array_column($result['clients'], 'client_id'));
        $this->assertSame(2, $result['clients'][0]['purchases']);
    }

    public function test_nothing_found_returns_empty_lists_not_errors(): void
    {
        $result = $this->byClient(['q' => 'cartera']);

        $this->assertSame([], $result['clients']);
        $this->assertSame([], $result['products']);
        $this->assertSame(0, $result['summary']['buyers']);
        $this->assertNull($result['summary']['first_at']);
        $this->assertFalse($result['has_more']);
    }

    // ── Controlador y rutas ──────────────────────────────────────────────────

    private function callController(string $method, array $query, ?string $clientId = null): \Illuminate\Http\JsonResponse
    {
        $request = Request::create('/x', 'GET', array_merge(['business_id' => self::BIZ], $query));
        $controller = app(ProductSalesHistoryController::class);

        return $clientId === null ? $controller->$method($request) : $controller->$method($request, $clientId);
    }

    public function test_the_controller_returns_the_history_and_rejects_bad_ranges_with_422(): void
    {
        $this->seedScenario();

        $ok = $this->callController('index', ['q' => 'tinte']);
        $this->assertSame(200, $ok->getStatusCode());
        $this->assertSame('c-ana', json_decode($ok->getContent(), true)['clients'][0]['client_id']);

        $tooWide = $this->callController('index', ['start' => '2024-01-01', 'end' => '2026-11-02']);
        $this->assertSame(422, $tooWide->getStatusCode());
        $this->assertStringContainsString('12 meses', json_decode($tooWide->getContent(), true)['message']);

        $inverted = $this->callController('index', ['start' => '2026-10-10', 'end' => '2026-10-01']);
        $this->assertSame(422, $inverted->getStatusCode());
    }

    public function test_the_controller_validates_its_inputs(): void
    {
        $this->expectException(ValidationException::class);
        $this->callController('index', ['sort' => 'inventado']);
    }

    public function test_the_controller_rejects_a_malformed_client_id_and_accepts_none(): void
    {
        $this->seedScenario();

        $this->assertSame(422, $this->callController('clientSales', ['q' => 'tinte'], "x' OR '1'='1")->getStatusCode());
        $this->assertSame(200, $this->callController('clientSales', ['q' => 'tinte'], 'none')->getStatusCode());
        $this->assertSame(200, $this->callController('clientSales', ['q' => 'tinte'], 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')->getStatusCode());
    }

    public function test_the_routes_are_protected_like_the_product_list(): void
    {
        foreach (['api/products/sales-history', 'api/products/sales-history/client/{clientId}'] as $uri) {
            $route = collect(Route::getRoutes()->getRoutes())->first(fn ($r) => $r->uri() === $uri && in_array('GET', $r->methods(), true));

            $this->assertNotNull($route, "falta la ruta $uri");
            $this->assertStringContainsString('ProductSalesHistoryController', $route->getActionName());

            $middleware = $route->gatherMiddleware();
            $this->assertContains('feature:productos', $middleware, "$uri sin feature:productos");
            $this->assertContains('perm:inventory', $middleware, "$uri sin perm:inventory");
            $this->assertNotEmpty(array_filter($middleware, fn ($m) => str_starts_with((string) $m, 'auth')), "$uri sin autenticación");
        }
    }
}
