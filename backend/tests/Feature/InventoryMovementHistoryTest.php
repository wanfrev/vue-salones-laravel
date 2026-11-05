<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\InventoryMovementHistoryController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/**
 * Pestaña «Movimientos» de Inventario: filtros, fechas, totales y detalle. SQLite en memoria.
 */
class InventoryMovementHistoryTest extends TestCase
{
    private const BIZ = '11111111-1111-4111-8111-111111111111';
    private const OTHER = '22222222-2222-4222-8222-222222222222';
    private const BRANCH_A = 'bbbbbbbb-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    private const BRANCH_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    private const ADMIN = 'aaaaaaaa-0001-4000-8000-000000000001';
    private const CAJERA = 'aaaaaaaa-0002-4000-8000-000000000002';
    private const EMPLEADA = 'aaaaaaaa-0003-4000-8000-000000000003';

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
        Schema::create('product_categories', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('name');
        });
        Schema::create('products', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('category_id')->nullable();
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
        });
        Schema::create('appointments', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('client_id')->nullable();
            $t->string('service_id')->nullable();
            $t->string('employee_id')->nullable();
            $t->string('status')->nullable();
            $t->dateTime('start_time')->nullable();
        });
        Schema::create('transactions', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('method');
            $t->decimal('total_amount', 12, 2)->default(0);
            $t->dateTime('created_at')->nullable();
        });
        Schema::create('employee_payments', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('employee_id')->nullable();
            $t->string('type')->nullable();
            $t->string('concept')->nullable();
            $t->text('notes')->nullable();
            $t->decimal('amount', 12, 2)->default(0);
            $t->date('payment_date')->nullable();
        });
        Schema::create('suppliers', function ($t) {
            $t->string('id')->primary();
            $t->string('name')->nullable();
        });
        Schema::create('purchase_invoices', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('supplier_id')->nullable();
            $t->string('invoice_number')->nullable();
            $t->date('invoice_date')->nullable();
            $t->decimal('total', 12, 2)->default(0);
        });
        Schema::create('branches', function ($t) {
            $t->string('id')->primary();
            $t->string('name')->nullable();
        });
        Schema::create('inventory_locations', function ($t) {
            $t->string('id')->primary();
            $t->string('name')->nullable();
        });
        Schema::create('inventory_movements', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('branch_id')->nullable();
            $t->string('location_id')->nullable();
            $t->string('product_id');
            $t->string('variant_id')->nullable();
            $t->string('movement_type');
            $t->decimal('quantity', 12, 3);
            $t->decimal('unit_cost', 12, 2)->default(0);
            $t->decimal('exchange_rate_used', 12, 4)->nullable();
            $t->string('reference_type')->nullable();
            $t->string('reference_id')->nullable();
            $t->text('notes')->nullable();
            $t->string('created_by')->nullable();
            $t->string('client_id')->nullable();
            $t->dateTime('created_at')->nullable();
        });

        DB::table('businesses')->insert([
            ['id' => self::BIZ, 'timezone' => 'America/Caracas'],
            ['id' => self::OTHER, 'timezone' => 'America/Caracas'],
        ]);
        DB::table('profiles')->insert([
            ['id' => self::ADMIN, 'full_name' => 'Wanfredo Admin'],
            ['id' => self::CAJERA, 'full_name' => 'Camila Cajera'],
            ['id' => self::EMPLEADA, 'full_name' => 'Elena Empleada'],
        ]);
        DB::table('clients')->insert([
            ['id' => 'c-ana', 'full_name' => 'ANA PÉREZ', 'phone' => '0414-1'],
            ['id' => 'c-belen', 'full_name' => 'BELÉN RUIZ', 'phone' => '0414-2'],
        ]);
        DB::table('product_categories')->insert([
            ['id' => 'cccccccc-0000-4000-8000-0000000000c1', 'business_id' => self::BIZ, 'name' => 'Comida'],
            ['id' => 'cccccccc-0000-4000-8000-0000000000c2', 'business_id' => self::BIZ, 'name' => 'Tintes'],
        ]);
        DB::table('products')->insert([
            ['id' => 'eeeeeeee-0000-4000-8000-0000000000a1', 'business_id' => self::BIZ, 'category_id' => 'cccccccc-0000-4000-8000-0000000000c1', 'name' => 'Tortas', 'sku' => 'TOR-1'],
            ['id' => 'p-tinte', 'business_id' => self::BIZ, 'category_id' => 'cccccccc-0000-4000-8000-0000000000c2', 'name' => 'Tinte Igora', 'sku' => 'TIN-71'],
            ['id' => 'p-shampoo', 'business_id' => self::BIZ, 'category_id' => null, 'name' => 'Shampoo', 'sku' => 'SHA-1'],
            ['id' => 'p-otro', 'business_id' => self::OTHER, 'category_id' => null, 'name' => 'Tortas', 'sku' => 'TOR-1'],
        ]);
        DB::table('product_variants')->insert([['id' => 'v-rubio', 'product_id' => 'p-tinte', 'name' => 'Rubio 7.1', 'sku' => 'IGO-71']]);
        DB::table('branches')->insert([['id' => self::BRANCH_A, 'name' => 'Sede Centro'], ['id' => self::BRANCH_B, 'name' => 'Sede Este']]);
        DB::table('inventory_locations')->insert([['id' => 'loc-1', 'name' => 'Almacén principal']]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    // ── Utilidades ───────────────────────────────────────────────────────────

    private function uuid(): string
    {
        return sprintf('dddddddd-0000-4000-8000-%012d', ++$this->seq);
    }

    /** Un movimiento; devuelve su id. La fecha es UTC. */
    private function move(string $product, string $type, float $qty, string $at, array $over = []): string
    {
        $id = $over['id'] ?? $this->uuid();
        DB::table('inventory_movements')->insert(array_merge([
            'id' => $id, 'business_id' => self::BIZ, 'product_id' => $product, 'movement_type' => $type,
            'quantity' => $qty, 'unit_cost' => 0, 'created_by' => self::ADMIN, 'created_at' => $at,
        ], $over));

        return $id;
    }

    private function callController(string $method, array $query = [], string $business = self::BIZ, ?string $id = null): JsonResponse
    {
        $request = Request::create('/inventory/movement-history', 'GET', array_merge(['business_id' => $business], $query));
        $controller = app(InventoryMovementHistoryController::class);

        return $id === null ? $controller->index($request) : $controller->show($request, $id);
    }

    private function list(array $query = [], string $business = self::BIZ): array
    {
        $res = $this->callController('index', $query, $business);
        $this->assertSame(200, $res->getStatusCode(), $res->getContent());

        return json_decode($res->getContent(), true);
    }

    private function names(array $result): array
    {
        return array_map(fn ($m) => $m['product_name'], $result['movements']);
    }

    // ── Fechas ───────────────────────────────────────────────────────────────

    public function test_all_of_october_is_listed_not_just_the_latest_movements(): void
    {
        // Más de 50 movimientos en octubre: antes la pantalla solo veía los últimos 50.
        for ($i = 0; $i < 60; $i++) {
            $this->move('eeeeeeee-0000-4000-8000-0000000000a1', 'consumption', -1, '2026-10-15 15:00:00');
        }
        $this->move('eeeeeeee-0000-4000-8000-0000000000a1', 'consumption', -1, '2026-11-01 15:00:00'); // noviembre

        $october = $this->list(['start' => '2026-10-01', 'end' => '2026-10-31', 'q' => 'tortas']);

        $this->assertSame(60, $october['summary']['movements']);
        $this->assertEquals(60, $october['summary']['units_out']);
        $this->assertSame(['start' => '2026-10-01', 'end' => '2026-10-31'], $october['range']);
    }

    public function test_dates_are_the_business_local_day_not_utc(): void
    {
        $this->move('eeeeeeee-0000-4000-8000-0000000000a1', 'sale', -1, '2026-10-01 03:59:00'); // 30/sep 23:59 en Caracas: fuera
        $inFirst = $this->move('eeeeeeee-0000-4000-8000-0000000000a1', 'sale', -1, '2026-10-01 04:00:00'); // 1/oct 00:00: dentro
        $inLast = $this->move('eeeeeeee-0000-4000-8000-0000000000a1', 'sale', -1, '2026-11-01 03:59:00'); // 31/oct 23:59: dentro
        $this->move('eeeeeeee-0000-4000-8000-0000000000a1', 'sale', -1, '2026-11-01 04:00:00'); // 1/nov 00:00: fuera

        $ids = array_column($this->list(['start' => '2026-10-01', 'end' => '2026-10-31'])['movements'], 'id');

        $this->assertEqualsCanonicalizing([$inFirst, $inLast], $ids);
    }

    public function test_without_dates_it_shows_the_last_30_days(): void
    {
        $this->move('eeeeeeee-0000-4000-8000-0000000000a1', 'sale', -1, '2026-10-04 16:00:00'); // hace 29 días (cuenta hoy): dentro
        $this->move('eeeeeeee-0000-4000-8000-0000000000a1', 'sale', -1, '2026-10-03 03:00:00'); // antes del 4/oct local: fuera

        $r = $this->list();

        $this->assertSame(1, $r['summary']['movements']);
        $this->assertSame('2026-10-04', $r['range']['start']);
        $this->assertSame('2026-11-02', $r['range']['end']);
    }

    public function test_a_range_over_12_months_or_reversed_is_rejected(): void
    {
        $this->assertSame(422, $this->callController('index', ['start' => '2025-01-01', 'end' => '2026-11-02'])->getStatusCode());
        $this->assertSame(422, $this->callController('index', ['start' => '2026-10-10', 'end' => '2026-10-01'])->getStatusCode());
    }

    // ── Filtros ──────────────────────────────────────────────────────────────

    public function test_it_only_shows_movements_of_the_business(): void
    {
        $this->move('eeeeeeee-0000-4000-8000-0000000000a1', 'sale', -1, '2026-10-20 15:00:00');
        $this->move('p-otro', 'sale', -5, '2026-10-20 15:00:00', ['business_id' => self::OTHER]);

        $this->assertSame(1, $this->list()['summary']['movements']);
        $this->assertSame(1, $this->list([], self::OTHER)['summary']['movements']);
        // Un producto de otro negocio nunca se junta, ni forzando el movimiento a este negocio.
        $this->move('p-otro', 'sale', -2, '2026-10-20 15:00:00');
        $this->assertSame(1, $this->list()['summary']['movements']);
    }

    public function test_a_movement_of_another_business_never_shows_even_on_a_product_of_this_one(): void
    {
        $mine = $this->move('eeeeeeee-0000-4000-8000-0000000000a1', 'sale', -1, '2026-10-20 15:00:00');
        // Dato inconsistente (movimiento de otro negocio sobre un producto de este): no debe aparecer ni sumarse.
        $this->move('eeeeeeee-0000-4000-8000-0000000000a1', 'sale', -7, '2026-10-20 15:00:00', ['business_id' => self::OTHER]);

        $r = $this->list();

        $this->assertSame([$mine], array_column($r['movements'], 'id'));
        $this->assertEquals(1, $r['summary']['units_out']);
    }

    public function test_filter_by_type_and_the_type_chips_keep_every_option(): void
    {
        $this->move('eeeeeeee-0000-4000-8000-0000000000a1', 'consumption', -1, '2026-10-20 15:00:00');
        $this->move('eeeeeeee-0000-4000-8000-0000000000a1', 'consumption', -1, '2026-10-21 15:00:00');
        $this->move('p-tinte', 'sale', -1, '2026-10-22 15:00:00');
        $this->move('p-tinte', 'purchase', 10, '2026-10-23 15:00:00');

        $r = $this->list(['types' => 'consumption']);

        $this->assertSame(2, $r['summary']['movements']);
        // Las opciones de tipo salen SIN el filtro de tipo: elegir uno no debe dejar a los demás sin cómo volver.
        $counts = array_column($r['types'], 'movements', 'type');
        $this->assertSame(['consumption' => 2, 'sale' => 1, 'purchase' => 1], $counts);

        $two = $this->list(['types' => 'sale,purchase']);
        $this->assertSame(2, $two['summary']['movements']);
    }

    public function test_an_unknown_type_is_rejected(): void
    {
        $this->assertSame(422, $this->callController('index', ['types' => 'sale,robo'])->getStatusCode());
    }

    public function test_filter_by_direction(): void
    {
        $this->move('p-tinte', 'purchase', 10, '2026-10-20 15:00:00');
        $this->move('p-tinte', 'sale', -2, '2026-10-21 15:00:00');
        $this->move('p-tinte', 'adjustment', 1, '2026-10-22 15:00:00');

        $this->assertSame(2, $this->list(['direction' => 'in'])['summary']['movements']);
        $out = $this->list(['direction' => 'out']);
        $this->assertSame(1, $out['summary']['movements']);
        $this->assertEquals(-2, $out['movements'][0]['quantity']);
    }

    public function test_search_matches_product_sku_variant_category_notes_client_user_and_employee(): void
    {
        $tx = $this->uuid();
        $this->move('p-tinte', 'sale', -1, '2026-10-20 15:00:00', ['variant_id' => 'v-rubio', 'client_id' => 'c-ana', 'reference_type' => 'direct', 'reference_id' => $tx, 'notes' => 'para retoque']);
        DB::table('employee_payments')->insert(['id' => 'ep-1', 'business_id' => self::BIZ, 'employee_id' => self::EMPLEADA, 'type' => 'consumption']);
        $this->move('eeeeeeee-0000-4000-8000-0000000000a1', 'consumption', -1, '2026-10-21 15:00:00', ['reference_type' => 'employee_payment', 'reference_id' => 'ep-1', 'created_by' => self::CAJERA]);

        foreach (['igora', 'tin-71', 'igo-71', 'rubio', 'tintes', 'retoque', 'ana p', 'wanfredo'] as $term) {
            $this->assertSame(1, $this->list(['q' => $term])['summary']['movements'], "«{$term}» debe encontrar el tinte");
        }
        foreach (['tortas', 'tor-1', 'comida', 'camila', 'elena'] as $term) {
            $this->assertSame(1, $this->list(['q' => $term])['summary']['movements'], "«{$term}» debe encontrar las tortas");
        }
        $this->assertSame(0, $this->list(['q' => 'inexistente'])['summary']['movements']);
    }

    public function test_search_treats_wildcards_literally_and_ignores_case(): void
    {
        $this->move('eeeeeeee-0000-4000-8000-0000000000a1', 'sale', -1, '2026-10-20 15:00:00', ['notes' => 'descuento 50% amiga']);
        $this->move('p-tinte', 'sale', -1, '2026-10-20 15:00:00', ['notes' => 'normal']);

        $this->assertSame(0, $this->list(['q' => '%'])['summary']['movements'] - 1);
        $this->assertSame(1, $this->list(['q' => '50%'])['summary']['movements']);
        $this->assertSame(0, $this->list(['q' => '_'])['summary']['movements']);
        $this->assertSame(1, $this->list(['q' => 'TORTAS'])['summary']['movements']);
    }

    public function test_filter_by_product_category_and_user(): void
    {
        $this->move('eeeeeeee-0000-4000-8000-0000000000a1', 'consumption', -1, '2026-10-20 15:00:00', ['created_by' => self::CAJERA]);
        $this->move('p-tinte', 'sale', -1, '2026-10-21 15:00:00', ['created_by' => self::ADMIN]);
        $this->move('p-shampoo', 'sale', -1, '2026-10-22 15:00:00', ['created_by' => self::ADMIN]);

        $this->assertSame(['Tortas'], $this->names($this->list(['product_id' => 'eeeeeeee-0000-4000-8000-0000000000a1'])));
        $this->assertSame(['Tinte Igora'], $this->names($this->list(['category_id' => 'cccccccc-0000-4000-8000-0000000000c2'])));
        $this->assertSame(['Tortas'], $this->names($this->list(['user_id' => self::CAJERA])));
        $this->assertSame(2, $this->list(['user_id' => self::ADMIN])['summary']['movements']);
    }

    public function test_the_user_options_keep_every_user_when_one_is_selected(): void
    {
        $this->move('eeeeeeee-0000-4000-8000-0000000000a1', 'consumption', -1, '2026-10-20 15:00:00', ['created_by' => self::CAJERA]);
        $this->move('p-tinte', 'sale', -1, '2026-10-21 15:00:00', ['created_by' => self::ADMIN]);
        $this->move('p-tinte', 'sale', -1, '2026-10-22 15:00:00', ['created_by' => self::ADMIN]);

        $r = $this->list(['user_id' => self::CAJERA]);

        $this->assertSame(1, $r['summary']['movements']);
        $users = array_column($r['users'], 'movements', 'name');
        $this->assertSame(['Wanfredo Admin' => 2, 'Camila Cajera' => 1], $users);
    }

    public function test_the_category_options_keep_every_category_when_one_is_selected(): void
    {
        $this->move('eeeeeeee-0000-4000-8000-0000000000a1', 'sale', -1, '2026-10-20 15:00:00'); // Comida
        $this->move('p-tinte', 'sale', -1, '2026-10-21 15:00:00'); // Tintes
        $this->move('p-tinte', 'sale', -1, '2026-10-22 15:00:00');
        $this->move('p-shampoo', 'sale', -1, '2026-10-22 15:00:00'); // sin categoría: no es una opción

        $r = $this->list(['category_id' => 'cccccccc-0000-4000-8000-0000000000c1']);

        $this->assertSame(1, $r['summary']['movements']);
        $this->assertSame(['Comida' => 1, 'Tintes' => 2], array_column($r['categories'], 'movements', 'name'));
    }

    public function test_branch_filter_keeps_movements_without_branch(): void
    {
        $this->move('eeeeeeee-0000-4000-8000-0000000000a1', 'sale', -1, '2026-10-20 15:00:00', ['branch_id' => self::BRANCH_A]);
        $this->move('eeeeeeee-0000-4000-8000-0000000000a1', 'sale', -1, '2026-10-20 15:00:00', ['branch_id' => self::BRANCH_B]);
        $this->move('eeeeeeee-0000-4000-8000-0000000000a1', 'sale', -1, '2026-10-20 15:00:00', ['branch_id' => null]);

        $this->assertSame(2, $this->list(['branch_id' => self::BRANCH_A])['summary']['movements']);
        $this->assertSame(3, $this->list()['summary']['movements']);
    }

    // ── Totales, orden y páginas ────────────────────────────────────────────

    public function test_totals_cover_everything_filtered_not_just_the_page(): void
    {
        for ($i = 0; $i < 30; $i++) {
            $this->move('p-tinte', 'sale', -2, '2026-10-20 15:00:00', ['unit_cost' => 3.5]);
        }
        $this->move('p-tinte', 'purchase', 100, '2026-10-19 15:00:00', ['unit_cost' => 2]);

        $r = $this->list();

        $this->assertCount(25, $r['movements']);
        $this->assertTrue($r['has_more']);
        $this->assertSame(31, $r['summary']['movements']);
        $this->assertEquals(100, $r['summary']['units_in']);
        $this->assertEquals(60, $r['summary']['units_out']);
        $this->assertEquals(200.0, $r['summary']['cost_in']);
        $this->assertEquals(210.0, $r['summary']['cost_out']); // 30 × 2 × 3,5
    }

    public function test_pagination_gives_every_movement_exactly_once(): void
    {
        for ($i = 0; $i < 30; $i++) {
            $this->move('eeeeeeee-0000-4000-8000-0000000000a1', 'sale', -1, '2026-10-20 15:00:00'); // misma hora a propósito
        }

        $first = $this->list(['page' => 1]);
        $second = $this->list(['page' => 2]);

        $this->assertTrue($first['has_more']);
        $this->assertFalse($second['has_more']);
        $ids = array_merge(array_column($first['movements'], 'id'), array_column($second['movements'], 'id'));
        $this->assertCount(30, $ids);
        $this->assertCount(30, array_unique($ids));
    }

    public function test_sorting_by_recent_oldest_and_quantity(): void
    {
        $this->move('eeeeeeee-0000-4000-8000-0000000000a1', 'sale', -1, '2026-10-10 15:00:00');
        $this->move('p-tinte', 'sale', -9, '2026-10-20 15:00:00');
        $this->move('p-shampoo', 'purchase', 4, '2026-10-30 15:00:00');

        $this->assertSame(['Shampoo', 'Tinte Igora', 'Tortas'], $this->names($this->list(['sort' => 'recent'])));
        $this->assertSame(['Tortas', 'Tinte Igora', 'Shampoo'], $this->names($this->list(['sort' => 'oldest'])));
        $this->assertSame(['Tinte Igora', 'Shampoo', 'Tortas'], $this->names($this->list(['sort' => 'quantity'])));
    }

    // ── Cada fila ────────────────────────────────────────────────────────────

    public function test_a_row_says_who_registered_it_who_it_affects_and_where(): void
    {
        DB::table('employee_payments')->insert(['id' => 'ep-1', 'business_id' => self::BIZ, 'employee_id' => self::EMPLEADA, 'type' => 'consumption']);
        $this->move('eeeeeeee-0000-4000-8000-0000000000a1', 'consumption', -1, '2026-10-20 15:00:00', [
            'reference_type' => 'employee_payment', 'reference_id' => 'ep-1', 'created_by' => self::CAJERA,
            'unit_cost' => 2.5, 'branch_id' => self::BRANCH_A, 'location_id' => 'loc-1', 'notes' => 'Consumo de Elena',
        ]);

        $m = $this->list()['movements'][0];

        $this->assertSame('consumption', $m['type']);
        $this->assertSame('Camila Cajera', $m['user_name']);
        $this->assertSame('Elena Empleada', $m['person_name']);
        $this->assertSame('employee', $m['person_role']);
        $this->assertSame('Comida', $m['category_name']);
        $this->assertSame('TOR-1', $m['product_sku']);
        $this->assertSame('Sede Centro', $m['branch_name']);
        $this->assertSame('Almacén principal', $m['location_name']);
        $this->assertEquals(2.5, $m['total_cost']);
    }

    public function test_a_sale_inside_an_appointment_shows_the_appointment_client(): void
    {
        DB::table('appointments')->insert(['id' => 'apt-1', 'business_id' => self::BIZ, 'client_id' => 'c-belen']);
        $this->move('p-tinte', 'sale', -1, '2026-10-20 15:00:00', ['reference_type' => 'appointment', 'reference_id' => 'apt-1']);

        $m = $this->list()['movements'][0];

        $this->assertSame('BELÉN RUIZ', $m['person_name']);
        $this->assertSame('client', $m['person_role']);
    }

    public function test_a_movement_without_user_or_person_still_lists(): void
    {
        $this->move('p-shampoo', 'adjustment', 3, '2026-10-20 15:00:00', ['created_by' => null]);

        $m = $this->list()['movements'][0];

        $this->assertNull($m['user_name']);
        $this->assertNull($m['person_name']);
        $this->assertNull($m['person_role']);
    }

    // ── Detalle ──────────────────────────────────────────────────────────────

    private function detail(string $id, string $business = self::BIZ): JsonResponse
    {
        return $this->callController('show', [], $business, $id);
    }

    public function test_detail_of_a_consumption_names_the_employee_and_the_concept(): void
    {
        DB::table('employee_payments')->insert(['id' => 'ep-1', 'business_id' => self::BIZ, 'employee_id' => self::EMPLEADA, 'type' => 'consumption', 'concept' => 'Almuerzo', 'amount' => 5, 'payment_date' => '2026-10-20']);
        $id = $this->move('eeeeeeee-0000-4000-8000-0000000000a1', 'consumption', -1, '2026-10-20 15:00:00', ['reference_type' => 'employee_payment', 'reference_id' => 'ep-1', 'created_by' => self::CAJERA]);

        $d = json_decode($this->detail($id)->getContent(), true);

        $this->assertSame('employee_payment', $d['source']['kind']);
        $this->assertSame('Elena Empleada', $d['source']['employee']);
        $this->assertSame('Almuerzo', $d['source']['concept']);
        $this->assertEquals(5, $d['source']['amount']);
        $this->assertSame('Camila Cajera', $d['movement']['user_name']);
    }

    public function test_detail_of_an_appointment_sale_gives_service_client_and_employee(): void
    {
        DB::table('services')->insert(['id' => 's-1', 'business_id' => self::BIZ, 'name' => 'Tinte raíz']);
        DB::table('appointments')->insert(['id' => 'apt-1', 'business_id' => self::BIZ, 'client_id' => 'c-ana', 'service_id' => 's-1', 'employee_id' => self::EMPLEADA, 'status' => 'completed', 'start_time' => '2026-10-20 15:00:00']);
        $id = $this->move('p-tinte', 'sale', -1, '2026-10-20 15:30:00', ['reference_type' => 'appointment', 'reference_id' => 'apt-1']);
        // Otra línea de la misma cita
        $this->move('p-shampoo', 'sale', -1, '2026-10-20 15:30:00', ['reference_type' => 'appointment', 'reference_id' => 'apt-1']);

        $d = json_decode($this->detail($id)->getContent(), true);

        $this->assertSame('appointment', $d['source']['kind']);
        $this->assertSame('Tinte raíz', $d['source']['service']);
        $this->assertSame('ANA PÉREZ', $d['source']['client']);
        $this->assertSame('Elena Empleada', $d['source']['employee']);
        $this->assertSame('completed', $d['source']['status']);
        $this->assertSame(['Shampoo'], array_column($d['related'], 'product_name'));
    }

    public function test_detail_of_a_direct_sale_and_a_purchase_invoice(): void
    {
        DB::table('transactions')->insert(['id' => 'tx-1', 'business_id' => self::BIZ, 'method' => 'zelle', 'total_amount' => 40, 'created_at' => '2026-10-20 15:00:00']);
        $sale = $this->move('p-tinte', 'sale', -1, '2026-10-20 15:00:00', ['reference_type' => 'direct', 'reference_id' => 'tx-1']);
        DB::table('suppliers')->insert(['id' => 'sup-1', 'name' => 'Distribuidora Belleza']);
        DB::table('purchase_invoices')->insert(['id' => 'inv-1', 'business_id' => self::BIZ, 'supplier_id' => 'sup-1', 'invoice_number' => 'F-0042', 'invoice_date' => '2026-10-18', 'total' => 300]);
        $purchase = $this->move('p-tinte', 'purchase', 20, '2026-10-18 15:00:00', ['reference_type' => 'purchase_invoice', 'reference_id' => 'inv-1']);

        $s = json_decode($this->detail($sale)->getContent(), true);
        $p = json_decode($this->detail($purchase)->getContent(), true);

        $this->assertSame('sale', $s['source']['kind']);
        $this->assertSame('zelle', $s['source']['method']);
        $this->assertEquals(40, $s['source']['total']);
        $this->assertSame('purchase_invoice', $p['source']['kind']);
        $this->assertSame('F-0042', $p['source']['invoice_number']);
        $this->assertSame('Distribuidora Belleza', $p['source']['supplier']);
    }

    public function test_detail_lists_the_other_side_of_a_transfer(): void
    {
        $out = $this->move('p-tinte', 'transfer_out', -3, '2026-10-20 15:00:00', ['reference_type' => 'transfer', 'reference_id' => 'tr-1', 'branch_id' => self::BRANCH_A]);
        $this->move('p-tinte', 'transfer_in', 3, '2026-10-20 15:00:00', ['reference_type' => 'transfer', 'reference_id' => 'tr-1', 'branch_id' => self::BRANCH_B]);

        $d = json_decode($this->detail($out)->getContent(), true);

        $this->assertCount(1, $d['related']);
        $this->assertSame('transfer_in', $d['related'][0]['type']);
        $this->assertSame('Sede Este', $d['related'][0]['branch_name']);
    }

    public function test_detail_without_reference_has_no_source_and_a_missing_reference_is_flagged(): void
    {
        $free = $this->move('p-shampoo', 'adjustment', 2, '2026-10-20 15:00:00');
        $gone = $this->move('p-shampoo', 'sale', -1, '2026-10-20 15:00:00', ['reference_type' => 'direct', 'reference_id' => 'tx-borrada']);

        $a = json_decode($this->detail($free)->getContent(), true);
        $b = json_decode($this->detail($gone)->getContent(), true);

        $this->assertNull($a['source']);
        $this->assertSame([], $a['related']);
        $this->assertTrue($b['source']['missing']);
    }

    public function test_detail_of_another_business_or_a_bad_id_is_refused(): void
    {
        $other = $this->move('p-otro', 'sale', -1, '2026-10-20 15:00:00', ['business_id' => self::OTHER]);

        $this->assertSame(404, $this->detail($other)->getStatusCode());
        $this->assertSame(404, $this->detail($this->uuid())->getStatusCode());
        $this->assertSame(422, $this->detail('no-es-un-uuid')->getStatusCode());
    }

    public function test_detail_does_not_leak_an_appointment_of_another_business(): void
    {
        DB::table('appointments')->insert(['id' => 'apt-ajena', 'business_id' => self::OTHER, 'client_id' => 'c-ana', 'status' => 'completed', 'start_time' => '2026-10-20 15:00:00']);
        $id = $this->move('p-tinte', 'sale', -1, '2026-10-20 15:00:00', ['reference_type' => 'appointment', 'reference_id' => 'apt-ajena']);

        $d = json_decode($this->detail($id)->getContent(), true);

        $this->assertTrue($d['source']['missing']);
        $this->assertArrayNotHasKey('client', $d['source']);
    }

    public function test_detail_does_not_leak_sources_of_another_business(): void
    {
        DB::table('transactions')->insert(['id' => 'tx-ajena', 'business_id' => self::OTHER, 'method' => 'cash', 'total_amount' => 99, 'created_at' => '2026-10-20 15:00:00']);
        $id = $this->move('p-tinte', 'sale', -1, '2026-10-20 15:00:00', ['reference_type' => 'direct', 'reference_id' => 'tx-ajena']);

        $d = json_decode($this->detail($id)->getContent(), true);

        $this->assertTrue($d['source']['missing']);
    }

    public function test_invalid_validation_values_are_rejected(): void
    {
        foreach ([['direction' => 'sideways'], ['sort' => 'random'], ['page' => 0], ['product_id' => 'x'], ['start' => '02/11/2026']] as $bad) {
            try {
                $this->callController('index', $bad);
                $this->fail('Debió rechazar '.json_encode($bad));
            } catch (ValidationException) {
                $this->addToAssertionCount(1);
            }
        }
    }
}
