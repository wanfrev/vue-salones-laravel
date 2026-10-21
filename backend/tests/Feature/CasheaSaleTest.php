<?php

namespace Tests\Feature;

use App\Models\Credit;
use App\Models\DailyReport;
use App\Models\Transaction;
use App\Services\CasheaService;
use App\Services\PosService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Ventas con Cashea (así lo explicó el negocio): entran a Finanzas el mismo día por el NETO (monto − % de
 * Cashea) y el % del especialista se aplica a ese neto; lo que el cliente le paga después a Cashea no se
 * registra. Esquema mínimo en SQLite (el real usa Postgres) con solo lo que tocan los cobros del POS.
 */
class CasheaSaleTest extends TestCase
{
    private const BIZ = '00000000-0000-4000-8000-0000000000b1';
    private const CLIENT = '00000000-0000-4000-8000-0000000000c1';
    private const DOC = '00000000-0000-4000-8000-0000000000d1';
    private const SERVICE = '00000000-0000-4000-8000-0000000000e1';
    private const SERVICE2 = '00000000-0000-4000-8000-0000000000e2';

    protected function setUp(): void
    {
        parent::setUp();
        Schema::disableForeignKeyConstraints();

        Schema::create('businesses', function ($t) {
            $t->uuid('id')->primary();
            $t->string('name')->nullable();
            $t->string('niche_type')->nullable();
            $t->text('features')->nullable();
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
            $t->text('notes')->nullable();
            $t->timestamps();
        });
        Schema::create('profiles', function ($t) {
            $t->uuid('id')->primary();
            $t->uuid('business_id')->nullable();
            $t->string('full_name')->nullable();
            $t->string('role')->nullable();
            $t->decimal('pay_percentage', 6, 2)->nullable();
        });
        Schema::create('services', function ($t) {
            $t->uuid('id')->primary();
            $t->uuid('business_id')->nullable();
            $t->uuid('branch_id')->nullable();
            $t->string('name');
            $t->integer('duration_minutes')->nullable();
            $t->decimal('price', 10, 2)->nullable();
            $t->decimal('local_percentage', 6, 2)->nullable();
            $t->boolean('is_fixed_commission')->default(false);
            $t->decimal('fixed_commission_amount', 10, 2)->nullable();
            $t->decimal('fixed_commission_assistant_amount', 10, 2)->nullable();
            $t->uuid('linked_product_id')->nullable();
            $t->uuid('linked_variant_id')->nullable();
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
            $t->timestamp('end_time')->nullable();
            $t->string('status')->nullable();
            $t->string('payment_status')->default('unpaid');
            $t->string('source')->nullable();
            $t->uuid('created_by')->nullable();
            $t->uuid('group_id')->nullable();
            $t->decimal('price_override', 10, 2)->nullable();
            $t->decimal('employee_percentage_override', 6, 2)->nullable();
            $t->decimal('assistant_percentage', 6, 2)->nullable();
            $t->boolean('is_fixed_commission_override')->nullable();
            $t->decimal('employee_amount_override', 10, 2)->nullable();
            $t->decimal('assistant_amount_override', 10, 2)->nullable();
            $t->text('service_notes')->nullable();
            $t->text('internal_notes')->nullable();
            $t->text('associated_products')->nullable();
            $t->text('clinical_history')->nullable();
            $t->timestamps();
        });
        Schema::create('transactions', function ($t) {
            $t->uuid('id')->primary();
            $t->uuid('business_id');
            $t->uuid('branch_id')->nullable();
            $t->uuid('appointment_id')->nullable();
            $t->uuid('employee_id')->nullable();
            $t->decimal('total_amount', 15, 2)->default(0);
            $t->decimal('local_amount', 15, 2)->default(0);
            $t->decimal('employee_amount', 15, 2)->default(0);
            $t->decimal('assistant_amount', 15, 2)->default(0);
            $t->decimal('local_percentage', 6, 2)->default(0);
            $t->decimal('employee_percentage', 6, 2)->default(0);
            $t->decimal('assistant_percentage', 6, 2)->default(0);
            $t->string('method');
            $t->decimal('exchange_rate_used', 15, 4)->nullable();
            $t->text('payments_breakdown')->nullable();
            $t->decimal('tip_amount', 15, 2)->default(0);
            $t->string('tip_currency')->nullable();
            $t->uuid('created_by')->nullable();
            $t->text('notes')->nullable();
            $t->timestamp('paid_at')->nullable();
            $t->string('receipt_code')->nullable();
            $t->timestamps();
        });
        Schema::create('credits', function ($t) {
            $t->uuid('id')->primary();
            $t->uuid('business_id');
            $t->uuid('branch_id')->nullable();
            $t->uuid('client_id')->nullable();
            $t->string('client_name');
            $t->string('client_phone')->nullable();
            $t->uuid('transaction_id')->nullable();
            $t->decimal('amount', 15, 2);
            $t->decimal('paid_amount', 15, 2)->default(0);
            $t->string('currency')->default('USD');
            $t->string('status')->default('pending');
            $t->timestamp('paid_at')->nullable();
            $t->string('paid_method')->nullable();
            $t->uuid('created_by')->nullable();
            $t->timestamps();
        });
        Schema::create('daily_reports', function ($t) {
            $t->uuid('id')->primary();
            $t->uuid('business_id');
            $t->uuid('branch_id')->nullable();
            $t->uuid('user_id')->nullable();
            $t->date('date');
            foreach (['exchange_rate', 'z_report_bs', 'z_report_usd', 'pos_bs', 'pago_movil_bs', 'cash_bs', 'transfer_bs', 'cash_usd', 'zelle_usd',
                'binance_usd', 'cashea_usd', 'card_usd', 'gift_card_usd', 'other_usd', 'other_bs', 'credit_usd', 'credit_bs', 'total_bs', 'total_usd'] as $col) {
                $t->decimal($col, 15, 2)->default(0);
            }
            $t->text('credits_detail')->nullable();
            $t->timestamps();
        });

        DB::table('businesses')->insert(['id' => self::BIZ, 'name' => 'Psico Chiquis', 'niche_type' => 'psicologia', 'features' => '{}']);
        DB::table('clients')->insert(['id' => self::CLIENT, 'business_id' => self::BIZ, 'full_name' => 'Ana Pérez', 'phone' => '0414-1']);
        DB::table('profiles')->insert(['id' => self::DOC, 'business_id' => self::BIZ, 'full_name' => 'Dra. Soto', 'role' => 'empleado', 'pay_percentage' => 40]);
        DB::table('services')->insert([
            ['id' => self::SERVICE, 'business_id' => self::BIZ, 'name' => 'Terapia de lenguaje', 'duration_minutes' => 50, 'price' => 120, 'local_percentage' => 60],
            ['id' => self::SERVICE2, 'business_id' => self::BIZ, 'name' => 'Psicopedagogía', 'duration_minutes' => 50, 'price' => 40, 'local_percentage' => 60],
        ]);
    }

    // ── Ayudantes ───────────────────────────────────────────────────────────────

    private function appt(float $price = 120): string
    {
        $id = (string) Str::uuid();
        DB::table('appointments')->insert([
            'id' => $id, 'business_id' => self::BIZ, 'client_id' => self::CLIENT, 'employee_id' => self::DOC, 'service_id' => self::SERVICE,
            'start_time' => '2026-10-20 15:00:00', 'end_time' => '2026-10-20 15:50:00', 'status' => 'completed', 'price_override' => $price,
        ]);

        return $id;
    }

    private function cashea(float $fee = 10, float $down = 40): array
    {
        return ['fee_percentage' => $fee, 'down_payment_percentage' => $down];
    }

    private function sell(string $appointmentId, float $amount, ?array $cashea, string $method = 'cashea'): Transaction
    {
        $id = app(PosService::class)->processSale(
            appointmentId: $appointmentId,
            serviceAmount: $amount,
            method: $method,
            products: [],
            notes: null,
            exchangeRate: 1,
            paymentsBreakdown: [['method' => $method, 'currency' => 'USD', 'inputAmount' => $amount, 'amount' => $amount]],
            tipAmount: 0,
            businessId: self::BIZ,
            createdBy: self::DOC,
            cashea: $cashea,
        );

        return Transaction::find($id);
    }

    // ── Cálculo ─────────────────────────────────────────────────────────────────

    public function test_commission_down_payment_and_net_are_calculated_on_the_cashea_amount(): void
    {
        $this->assertSame(['fee' => 16.4, 'down_payment' => 65.6, 'net' => 147.6], CasheaService::totals(164, 10, 40));
        $this->assertSame(['fee' => 12.4, 'down_payment' => 49.6, 'net' => 111.6], CasheaService::totals(124, 10, 40));
        $this->assertSame(147.6, CasheaService::net(164, $this->cashea()));
    }

    public function test_the_cashea_block_is_validated(): void
    {
        $ok = fn (array $data) => !Validator::make($data, CasheaService::rules())->fails();

        $this->assertTrue($ok([]));                                  // opcional: el resto de métodos no lo mandan
        $this->assertTrue($ok(['cashea' => $this->cashea()]));
        $this->assertFalse($ok(['cashea' => ['fee_percentage' => 60, 'down_payment_percentage' => 40]]));
        $this->assertFalse($ok(['cashea' => ['fee_percentage' => 10, 'down_payment_percentage' => 140]]));
        $this->assertFalse($ok(['cashea' => ['down_payment_percentage' => 40]]));
    }

    // ── La venta ────────────────────────────────────────────────────────────────

    public function test_a_cashea_sale_is_income_today_for_the_amount_after_the_fee(): void
    {
        $appt = $this->appt(120);
        $tx = $this->sell($appt, 164, $this->cashea());

        $this->assertSame('cashea', $tx->method);                     // entra a Finanzas como Cashea, hoy
        $this->assertEquals(147.6, $tx->total_amount);                // 164 − 10%
        $this->assertEquals(147.6, $tx->payments_breakdown[0]['amount']);
        $this->assertSame([
            'gross' => 164, 'fee_percentage' => 10, 'fee_amount' => 16.4, 'down_payment_percentage' => 40, 'down_payment_amount' => 65.6,
        ], $tx->payments_breakdown[0]['cashea']);
        $this->assertSame('Cashea: $164.00 − 10% ($16.40) = $147.60 · inicial 40% ($65.60)', $tx->notes);
        $this->assertSame('paid', DB::table('appointments')->where('id', $appt)->value('payment_status'));
    }

    public function test_nothing_is_left_pending_with_cashea(): void
    {
        $this->sell($this->appt(120), 164, $this->cashea());

        $this->assertSame(0, Credit::count());                        // el resto se lo paga el cliente a Cashea
        $this->assertSame(0, DailyReport::count());                   // no se anota como crédito en el cierre
    }

    public function test_the_appointment_is_paid_even_if_the_net_is_below_the_list_price(): void
    {
        $appt = $this->appt(120);
        $tx = $this->sell($appt, 124, $this->cashea());               // neto 111,60 < 120

        $this->assertEquals(111.6, $tx->total_amount);
        $this->assertSame('paid', DB::table('appointments')->where('id', $appt)->value('payment_status'));
    }

    public function test_the_notes_typed_at_the_pos_are_kept(): void
    {
        $id = app(PosService::class)->processSale(
            appointmentId: $this->appt(), serviceAmount: 164, method: 'cashea', products: [], notes: 'Pagó la mamá',
            exchangeRate: 1, paymentsBreakdown: [], tipAmount: 0, businessId: self::BIZ, createdBy: self::DOC, cashea: $this->cashea(),
        );

        $this->assertStringEndsWith('. Pagó la mamá', Transaction::find($id)->notes);
    }

    // ── Comisión del especialista: sobre el neto ────────────────────────────────

    public function test_the_specialists_percentage_applies_to_the_amount_after_cashea_fee(): void
    {
        $this->assertEquals(59.04, $this->sell($this->appt(120), 164, $this->cashea())->employee_amount); // 40% de 147,60
    }

    public function test_the_commission_base_follows_the_fee_of_the_day(): void
    {
        $this->assertEquals(60.35, $this->sell($this->appt(120), 164, $this->cashea(8))->employee_amount); // 40% de 150,88
    }

    public function test_a_program_paid_with_cashea_nets_each_session(): void
    {
        $first = $this->sell($this->appt(60), 82, $this->cashea());
        $second = $this->sell($this->appt(60), 82, $this->cashea());

        $this->assertEquals(73.8, $first->total_amount);
        $this->assertEquals(73.8, $second->total_amount);
        $this->assertEquals(29.52, $first->employee_amount);         // entre las dos, 40% de 147,60
        $this->assertEquals(29.52, $second->employee_amount);
    }

    public function test_a_direct_service_sale_with_several_services_nets_each_one(): void
    {
        app(PosService::class)->processDirectServiceSale(
            serviceId: null, employeeId: null, assistantEmployeeId: null, clientId: self::CLIENT,
            serviceAmount: 164, method: 'cashea', products: [], notes: null, exchangeRate: 1,
            paymentsBreakdown: [['method' => 'cashea', 'currency' => 'USD', 'inputAmount' => 164, 'amount' => 164]],
            tipAmount: 0, businessId: self::BIZ, branchId: null, createdBy: self::DOC,
            services: [
                ['service_id' => self::SERVICE, 'employee_id' => self::DOC, 'price' => 123],
                ['service_id' => self::SERVICE2, 'employee_id' => self::DOC, 'price' => 41],
            ],
            cashea: $this->cashea(),
        );

        $this->assertSame(['cashea'], Transaction::pluck('method')->unique()->values()->all());
        $this->assertEqualsWithDelta(147.6, (float) Transaction::sum('total_amount'), 0.001);
        $this->assertSame(0, Credit::count());
    }

    public function test_a_fixed_commission_is_not_reduced_by_cashea(): void
    {
        DB::table('services')->where('id', self::SERVICE)->update(['is_fixed_commission' => true, 'fixed_commission_amount' => 30]);

        $this->assertEquals(30, $this->sell($this->appt(120), 164, $this->cashea())->employee_amount);
    }

    // ── Todo lo demás, igual que antes ──────────────────────────────────────────

    public function test_without_the_cashea_block_it_is_saved_exactly_as_before(): void
    {
        $tx = $this->sell($this->appt(120), 120, null);

        $this->assertSame('cashea', $tx->method);
        $this->assertEquals(120, $tx->total_amount);
        $this->assertEquals(48, $tx->employee_amount);
    }

    public function test_other_methods_ignore_the_cashea_block(): void
    {
        $tx = $this->sell($this->appt(120), 120, $this->cashea(), 'zelle');

        $this->assertSame('zelle', $tx->method);
        $this->assertEquals(120, $tx->total_amount);
        $this->assertEquals(48, $tx->employee_amount);                // 40% de 120, como siempre
    }

    public function test_an_ordinary_credit_sale_still_creates_its_credit(): void
    {
        $this->sell($this->appt(120), 120, null, 'credito');

        $this->assertEquals(120, Credit::sole()->amount);
    }
}
