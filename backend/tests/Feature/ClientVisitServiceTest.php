<?php

namespace Tests\Feature;

use App\Services\ClientVisitService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tests\TestCase;

/**
 * Historial de visitas por cliente: una fila por visita (group_id), estados, totales en SQL,
 * ventas directas del POS, paginación "uno de más", filtro de fechas y aislamiento por negocio.
 * Esquema mínimo en SQLite (el real es Postgres): solo las columnas que toca el servicio.
 */
class ClientVisitServiceTest extends TestCase
{
    private const BIZ = '00000000-0000-4000-8000-0000000000b1';
    private const OTHER_BIZ = '00000000-0000-4000-8000-0000000000b2';
    private const CLIENT = '00000000-0000-4000-8000-0000000000c1';
    private const OTHER_CLIENT = '00000000-0000-4000-8000-0000000000c2';
    private const FOREIGN_CLIENT = '00000000-0000-4000-8000-0000000000c3';
    private const SVC_CUT = '00000000-0000-4000-8000-0000000000e1';
    private const SVC_COLOR = '00000000-0000-4000-8000-0000000000e2';
    private const EMP = '00000000-0000-4000-8000-0000000000d1';

    private ClientVisitService $svc;

    protected function setUp(): void
    {
        parent::setUp();
        Schema::disableForeignKeyConstraints();

        Schema::create('businesses', function ($t) {
            $t->uuid('id')->primary();
            $t->string('name')->nullable();
            $t->string('timezone')->nullable();
            $t->timestamps();
            $t->softDeletes();
        });
        Schema::create('clients', function ($t) {
            $t->uuid('id')->primary();
            $t->uuid('business_id')->nullable();
            $t->uuid('branch_id')->nullable();
            $t->string('full_name')->nullable();
            $t->string('phone')->nullable();
            $t->timestamps();
        });
        Schema::create('profiles', function ($t) {
            $t->uuid('id')->primary();
            $t->uuid('business_id')->nullable();
            $t->string('full_name')->nullable();
            $t->string('role')->nullable();
        });
        Schema::create('services', function ($t) {
            $t->uuid('id')->primary();
            $t->uuid('business_id')->nullable();
            $t->string('name');
            $t->decimal('price', 10, 2)->nullable();
        });
        Schema::create('appointments', function ($t) {
            $t->uuid('id')->primary();
            $t->uuid('business_id');
            $t->uuid('branch_id')->nullable();
            $t->uuid('client_id')->nullable();
            $t->uuid('employee_id')->nullable();
            $t->uuid('assistant_employee_id')->nullable();
            $t->uuid('service_id')->nullable();
            $t->timestamp('start_time')->nullable();
            $t->string('status')->nullable();
            $t->string('payment_status')->default('unpaid');
            $t->uuid('group_id')->nullable();
            $t->decimal('price_override', 10, 2)->nullable();
            $t->text('service_notes')->nullable();
            $t->text('internal_notes')->nullable();
            $t->timestamps();
        });
        Schema::create('transactions', function ($t) {
            $t->uuid('id')->primary();
            $t->uuid('business_id');
            $t->uuid('appointment_id')->nullable();
            $t->decimal('total_amount', 15, 2)->default(0);
            $t->decimal('tip_amount', 15, 2)->default(0);
            $t->string('method')->nullable();
            $t->text('payments_breakdown')->nullable();
            $t->text('notes')->nullable();
            $t->timestamp('paid_at')->nullable();
            $t->timestamp('created_at')->nullable();
        });
        Schema::create('products', function ($t) {
            $t->uuid('id')->primary();
            $t->uuid('business_id')->nullable();
            $t->string('name');
        });
        Schema::create('product_variants', function ($t) {
            $t->uuid('id')->primary();
            $t->uuid('product_id')->nullable();
            $t->string('name')->nullable();
        });
        Schema::create('inventory_movements', function ($t) {
            $t->uuid('id')->primary();
            $t->uuid('business_id');
            $t->uuid('branch_id')->nullable();
            $t->uuid('product_id');
            $t->uuid('variant_id')->nullable();
            $t->string('movement_type');
            $t->decimal('quantity', 12, 3)->default(0);
            $t->string('reference_type')->nullable();
            $t->string('reference_id')->nullable();
            $t->uuid('client_id')->nullable();
            $t->timestamp('created_at')->nullable();
        });

        DB::table('businesses')->insert([
            ['id' => self::BIZ, 'name' => 'Salón', 'timezone' => 'America/Caracas'],
            ['id' => self::OTHER_BIZ, 'name' => 'Otro', 'timezone' => 'UTC'],
        ]);
        DB::table('clients')->insert([
            ['id' => self::CLIENT, 'business_id' => self::BIZ, 'full_name' => 'Ana'],
            ['id' => self::OTHER_CLIENT, 'business_id' => self::BIZ, 'full_name' => 'Beatriz'],
            ['id' => self::FOREIGN_CLIENT, 'business_id' => self::OTHER_BIZ, 'full_name' => 'Ajena'],
        ]);
        DB::table('profiles')->insert([['id' => self::EMP, 'business_id' => self::BIZ, 'full_name' => 'Lucía', 'role' => 'empleado']]);
        DB::table('services')->insert([
            ['id' => self::SVC_CUT, 'business_id' => self::BIZ, 'name' => 'Corte', 'price' => 20],
            ['id' => self::SVC_COLOR, 'business_id' => self::BIZ, 'name' => 'Tinte', 'price' => 50],
        ]);

        $this->svc = app(ClientVisitService::class);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function appt(array $o = []): string
    {
        $id = (string) Str::uuid();
        DB::table('appointments')->insert(array_merge([
            'id' => $id, 'business_id' => self::BIZ, 'client_id' => self::CLIENT, 'employee_id' => self::EMP,
            'service_id' => self::SVC_CUT, 'start_time' => '2026-10-01 15:00:00', 'status' => 'completed',
            'payment_status' => 'paid',
        ], $o));

        return $id;
    }

    private function sale(string $clientId, string $paidAt, float $amount, array $products = [['Shampoo', 2]]): string
    {
        $tx = (string) Str::uuid();
        DB::table('transactions')->insert([
            'id' => $tx, 'business_id' => self::BIZ, 'total_amount' => $amount, 'method' => 'cash',
            'notes' => 'Venta directa', 'paid_at' => $paidAt, 'created_at' => $paidAt,
        ]);
        foreach ($products as [$name, $qty]) {
            $pid = (string) Str::uuid();
            DB::table('products')->insert(['id' => $pid, 'business_id' => self::BIZ, 'name' => $name]);
            DB::table('inventory_movements')->insert([
                'id' => (string) Str::uuid(), 'business_id' => self::BIZ, 'product_id' => $pid, 'movement_type' => 'sale',
                'quantity' => -$qty, 'reference_type' => 'direct', 'reference_id' => $tx, 'client_id' => $clientId, 'created_at' => $paidAt,
            ]);
        }

        return $tx;
    }

    public function test_services_of_one_visit_are_a_single_row_with_summed_amount(): void
    {
        $group = (string) Str::uuid();
        $this->appt(['group_id' => $group, 'service_id' => self::SVC_CUT]);
        $this->appt(['group_id' => $group, 'service_id' => self::SVC_COLOR]);
        $this->appt(['start_time' => '2026-09-01 15:00:00']);

        $res = $this->svc->page(self::BIZ, self::CLIENT);

        $this->assertCount(2, $res['data']);
        $visit = $res['data'][0];
        $this->assertSame($group, $visit['id']);
        $this->assertCount(2, $visit['services']);
        $this->assertSame(70.0, $visit['amount']);
        $this->assertSame('Lucía', $visit['services'][0]['employee']);
        $this->assertSame(2, $res['summary']['total_visits']);
    }

    public function test_states_and_money_totals_exclude_cancelled_and_no_show(): void
    {
        Carbon::setTestNow('2026-10-21 12:00:00');
        $this->appt(['start_time' => '2026-10-01 15:00:00']);                                                     // 20 pagada
        $this->appt(['start_time' => '2026-10-02 15:00:00', 'status' => 'completed', 'payment_status' => 'unpaid']); // 20 debe
        $this->appt(['start_time' => '2026-10-03 15:00:00', 'status' => 'cancelled', 'payment_status' => 'unpaid']);
        $this->appt(['start_time' => '2026-10-04 15:00:00', 'status' => 'no_show', 'payment_status' => 'unpaid']);
        $this->appt(['start_time' => '2026-10-25 15:00:00', 'status' => 'confirmed', 'payment_status' => 'unpaid']);   // futura

        $res = $this->svc->page(self::BIZ, self::CLIENT);
        $states = collect($res['data'])->pluck('state', 'date')->all();
        $s = $res['summary'];

        $this->assertSame(5, $s['total_visits']);
        $this->assertSame(2, $s['attended']);
        $this->assertSame(1, $s['cancelled']);
        $this->assertSame(1, $s['no_show']);
        $this->assertSame(1, $s['pending']);
        $this->assertSame(60.0, $s['total_billed']);   // 20 + 20 + 20 (la futura aún no cobrada cuenta como facturable)
        $this->assertSame(20.0, $s['total_paid']);
        $this->assertSame(20.0, $s['balance']);        // solo lo completado y sin pagar
        $this->assertStringStartsWith('2026-10-02', $s['last_visit']);
        $this->assertStringStartsWith('2026-10-25', $s['next_visit']);
        $this->assertContains('cancelled', $states);
        $this->assertContains('no_show', $states);
        $this->assertContains('pending', $states);
    }

    public function test_direct_sales_show_up_with_products_and_do_not_mix_between_clients(): void
    {
        $this->sale(self::CLIENT, '2026-10-10 18:00:00', 35.5, [['Shampoo', 2], ['Acondicionador', 1]]);
        $this->sale(self::OTHER_CLIENT, '2026-10-11 18:00:00', 99);

        $res = $this->svc->page(self::BIZ, self::CLIENT);

        $this->assertCount(1, $res['data']);
        $v = $res['data'][0];
        $this->assertSame('sale', $v['kind']);
        $this->assertSame(35.5, $v['amount']);
        $this->assertEqualsCanonicalizing(['Shampoo', 'Acondicionador'], array_column($v['products'], 'name'));
        $this->assertSame(2.0, collect($v['products'])->firstWhere('name', 'Shampoo')['quantity']);
        $this->assertSame('cash', $v['payments'][0]['method']);
        $this->assertSame(1, $res['summary']['direct_sales']);
        $this->assertSame(35.5, $res['summary']['direct_sales_total']);
    }

    public function test_mixed_payments_keep_method_bank_and_currency(): void
    {
        $id = $this->appt();
        DB::table('transactions')->insert([
            'id' => (string) Str::uuid(), 'business_id' => self::BIZ, 'appointment_id' => $id, 'total_amount' => 20, 'method' => 'mixed',
            'payments_breakdown' => json_encode([
                ['method' => 'cash', 'amount' => 10, 'currency' => 'USD'],
                ['method' => 'pago_movil', 'amount' => 400, 'currency' => 'VES', 'bank_name' => 'Banesco'],
            ]),
            'paid_at' => '2026-10-01 16:00:00', 'created_at' => '2026-10-01 16:00:00',
        ]);

        $payments = $this->svc->page(self::BIZ, self::CLIENT)['data'][0]['payments'];

        $this->assertCount(2, $payments);
        $this->assertSame('Banesco', $payments[1]['bank']);
        $this->assertSame('VES', $payments[1]['currency']);
        $this->assertSame(400.0, $payments[1]['amount']);
    }

    public function test_products_sold_with_an_appointment_appear_in_that_visit(): void
    {
        $id = $this->appt();
        $pid = (string) Str::uuid();
        DB::table('products')->insert(['id' => $pid, 'business_id' => self::BIZ, 'name' => 'Mascarilla']);
        DB::table('inventory_movements')->insert([
            'id' => (string) Str::uuid(), 'business_id' => self::BIZ, 'product_id' => $pid, 'movement_type' => 'sale',
            'quantity' => -1, 'reference_type' => 'appointment', 'reference_id' => $id, 'client_id' => self::CLIENT,
            'created_at' => '2026-10-01 16:00:00',
        ]);

        $visit = $this->svc->page(self::BIZ, self::CLIENT)['data'][0];

        $this->assertSame([['name' => 'Mascarilla', 'quantity' => 1.0]], $visit['products']);
    }

    public function test_pagination_uses_one_extra_row_and_orders_newest_first(): void
    {
        for ($i = 1; $i <= 25; $i++) {
            $this->appt(['start_time' => Carbon::parse('2026-01-01 10:00:00')->addDays($i)->format('Y-m-d H:i:s')]);
        }

        $p1 = $this->svc->page(self::BIZ, self::CLIENT, 1);
        $p2 = $this->svc->page(self::BIZ, self::CLIENT, 2);

        $this->assertCount(20, $p1['data']);
        $this->assertTrue($p1['meta']['has_more']);
        $this->assertCount(5, $p2['data']);
        $this->assertFalse($p2['meta']['has_more']);
        $this->assertArrayHasKey('summary', $p1);
        $this->assertArrayNotHasKey('summary', $p2);
        $this->assertGreaterThan($p1['data'][19]['date'], $p1['data'][0]['date']);
        $this->assertGreaterThan($p2['data'][0]['date'], $p1['data'][19]['date']);
        $this->assertSame(25, $p1['summary']['total_visits']);
    }

    public function test_date_filter_uses_the_business_day_and_applies_to_sales_too(): void
    {
        // 2026-10-10 02:00 UTC = 9 de octubre, 22:00 en Caracas (UTC-4)
        $this->appt(['start_time' => '2026-10-10 02:00:00']);
        $this->appt(['start_time' => '2026-10-20 15:00:00']);
        $this->sale(self::CLIENT, '2026-10-12 15:00:00', 10);

        $onlyNinth = $this->svc->page(self::BIZ, self::CLIENT, 1, '2026-10-09', '2026-10-09');
        $this->assertCount(1, $onlyNinth['data']);

        $range = $this->svc->page(self::BIZ, self::CLIENT, 1, '2026-10-11', '2026-10-31');
        // más reciente primero: la cita del 20 va antes que la venta del 12
        $this->assertSame(['appointment', 'sale'], array_column($range['data'], 'kind'));
        // el resumen no depende del filtro de fechas
        $this->assertSame(3, $range['summary']['total_visits']);
    }

    public function test_other_business_data_is_never_returned_or_reachable(): void
    {
        $this->appt(['business_id' => self::OTHER_BIZ, 'client_id' => self::FOREIGN_CLIENT]);
        $this->appt(['business_id' => self::OTHER_BIZ, 'client_id' => self::CLIENT]); // mismo id de cliente, otro negocio

        $this->assertCount(0, $this->svc->page(self::BIZ, self::CLIENT)['data']);

        $this->expectException(NotFoundHttpException::class);
        $this->svc->page(self::BIZ, self::FOREIGN_CLIENT);
    }

    public function test_internal_notes_only_for_management(): void
    {
        $this->appt(['service_notes' => 'Prefiere tinte suave', 'internal_notes' => 'Paga siempre tarde']);

        $employee = $this->svc->page(self::BIZ, self::CLIENT, 1, null, null, false)['data'][0];
        $admin = $this->svc->page(self::BIZ, self::CLIENT, 1, null, null, true)['data'][0];

        $this->assertSame('Prefiere tinte suave', $employee['notes']);
        $this->assertNull($employee['internal_notes']);
        $this->assertSame('Paga siempre tarde', $admin['internal_notes']);
    }

    // ── Estadísticas del directorio de clientes (ClientService::stats) ──────────

    private function stat(string $clientId): ?object
    {
        return app(\App\Services\ClientService::class)->stats(self::BIZ)->firstWhere('client_id', $clientId);
    }

    public function test_directory_last_visit_ignores_future_cancelled_and_no_show_appointments(): void
    {
        Carbon::setTestNow('2026-10-21 12:00:00');
        $this->appt(['start_time' => '2026-10-05 15:00:00']);                                              // atendida
        $this->appt(['start_time' => '2026-10-15 15:00:00', 'status' => 'cancelled', 'payment_status' => 'unpaid']);
        $this->appt(['start_time' => '2026-10-18 15:00:00', 'status' => 'no_show', 'payment_status' => 'unpaid']);
        $this->appt(['start_time' => '2026-10-24 15:00:00', 'status' => 'confirmed', 'payment_status' => 'unpaid']); // futura

        $s = $this->stat(self::CLIENT);

        $this->assertSame('2026-10-05', $s->last_visit);
        $this->assertSame(2, (int) $s->total_appointments); // la atendida y la futura; no las canceladas
    }

    public function test_directory_client_with_only_cancelled_appointments_has_no_visit(): void
    {
        Carbon::setTestNow('2026-10-21 12:00:00');
        $this->appt(['start_time' => '2026-10-10 15:00:00', 'status' => 'cancelled', 'payment_status' => 'unpaid']);

        $s = $this->stat(self::CLIENT);

        $this->assertNull($s->last_visit);
        $this->assertSame(0, (int) $s->total_appointments);
        $this->assertSame(0.0, (float) $s->total_spent);
    }

    public function test_directory_spend_uses_the_price_of_each_appointment_and_adds_direct_sales(): void
    {
        Carbon::setTestNow('2026-10-21 12:00:00');
        $this->appt(['start_time' => '2026-10-05 15:00:00', 'price_override' => 35]);   // en vez de 20 del servicio
        $this->appt(['start_time' => '2026-10-06 15:00:00']);                            // 20
        $this->sale(self::CLIENT, '2026-10-12 15:00:00', 10);

        $s = $this->stat(self::CLIENT);

        $this->assertSame(65.0, (float) $s->total_spent);
        $this->assertSame('2026-10-12', $s->last_visit); // la venta directa es la más reciente
    }

    public function test_directory_includes_clients_that_only_bought_products_and_uses_business_day(): void
    {
        Carbon::setTestNow('2026-10-21 12:00:00');
        // 2026-10-12 02:30 UTC = 11 de octubre 22:30 en Caracas
        $this->sale(self::OTHER_CLIENT, '2026-10-12 02:30:00', 12);

        $s = $this->stat(self::OTHER_CLIENT);

        $this->assertSame('2026-10-11', $s->last_visit);
        $this->assertSame(12.0, (float) $s->total_spent);
        $this->assertSame(0, (int) $s->total_appointments);
    }

    public function test_client_without_history_returns_empty_list_and_zeroed_summary(): void
    {
        $res = $this->svc->page(self::BIZ, self::OTHER_CLIENT);

        $this->assertSame([], $res['data']);
        $this->assertFalse($res['meta']['has_more']);
        $this->assertSame(0, $res['summary']['total_visits']);
        $this->assertNull($res['summary']['last_visit']);
        $this->assertNull($res['summary']['next_visit']);
        $this->assertSame(0.0, $res['summary']['balance']);
    }
}
