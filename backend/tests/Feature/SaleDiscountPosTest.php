<?php

namespace Tests\Feature;

use App\Models\Credit;
use App\Models\Transaction;
use App\Services\DailyReportPosSummaryService;
use App\Services\DailyReportSummaryService;
use App\Services\PosService;
use App\Support\UncollectedAmount;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

/**
 * Descuento por % al cobrar un servicio: baja lo que se cobra pero NO la comisión (siempre sobre el precio inicial).
 * Esquema mínimo en SQLite (el real usa Postgres) con solo lo que tocan los cobros del POS.
 */
class SaleDiscountPosTest extends TestCase
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

        Schema::create('gift_card_payments', function ($t) {
            $t->uuid('id')->primary();
            $t->uuid('business_id');
            $t->uuid('branch_id')->nullable();
            $t->uuid('gift_card_id');
            $t->decimal('amount', 12, 2);
            $t->text('payments_breakdown');
            $t->decimal('exchange_rate', 12, 4)->nullable();
            $t->timestamp('paid_at');
            $t->uuid('created_by')->nullable();
            $t->timestamps();
        });

        DB::table('businesses')->insert(['id' => self::BIZ, 'name' => 'Salón Luma', 'niche_type' => 'salon', 'features' => '{}']);
        DB::table('clients')->insert(['id' => self::CLIENT, 'business_id' => self::BIZ, 'full_name' => 'Ana Pérez', 'phone' => '0414-1']);
        DB::table('profiles')->insert(['id' => self::DOC, 'business_id' => self::BIZ, 'full_name' => 'Dra. Soto', 'role' => 'empleado', 'pay_percentage' => 40]);
        DB::table('services')->insert([
            ['id' => self::SERVICE, 'business_id' => self::BIZ, 'name' => 'Terapia de lenguaje', 'duration_minutes' => 50, 'price' => 120, 'local_percentage' => 60],
            ['id' => self::SERVICE2, 'business_id' => self::BIZ, 'name' => 'Psicopedagogía', 'duration_minutes' => 50, 'price' => 40, 'local_percentage' => 60],
        ]);
    }

    // ── Ayudantes ───────────────────────────────────────────────────────────────

    private function enable(bool $on = true): void
    {
        DB::table('businesses')->where('id', self::BIZ)->update(['features' => json_encode(['discount_enabled' => $on])]);
    }

    private function appt(float $price = 53): string
    {
        $id = (string) Str::uuid();
        DB::table('appointments')->insert([
            'id' => $id, 'business_id' => self::BIZ, 'client_id' => self::CLIENT, 'employee_id' => self::DOC, 'service_id' => self::SERVICE,
            'start_time' => '2026-11-05 15:00:00', 'end_time' => '2026-11-05 15:50:00', 'status' => 'completed', 'price_override' => $price,
        ]);

        return $id;
    }

    /** Desglose de un cobro de `$price` con `$pct` % de descuento pagado con `$method` (lo que pide el POS). */
    private function breakdown(float $price, float $pct, string $method = 'cash'): array
    {
        $discount = round($price * $pct / 100, 2);
        $payable = round($price - $discount, 2);

        return [
            ['method' => $method, 'currency' => 'USD', 'inputAmount' => $payable, 'amount' => $payable],
            ['method' => 'descuento', 'currency' => 'USD', 'inputAmount' => $discount, 'amount' => $discount, 'percentage' => $pct],
        ];
    }

    private function sell(string $appointmentId, float $price, array $breakdown, string $method = 'cash', ?array $cashea = null): Transaction
    {
        $id = app(PosService::class)->processSale(
            appointmentId: $appointmentId, serviceAmount: $price, method: $method, products: [], notes: null, exchangeRate: 1,
            paymentsBreakdown: $breakdown, tipAmount: 0, businessId: self::BIZ, createdBy: self::DOC, cashea: $cashea,
        );

        return Transaction::find($id);
    }

    private function rejects(callable $sale, string $message): void
    {
        try {
            $sale();
            $this->fail('Debió rechazar la venta');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString($message, $e->getMessage());
        }
    }

    // ── La comisión no se toca ──────────────────────────────────────────────────

    public function test_the_commission_is_calculated_on_the_initial_price_not_on_what_is_charged(): void
    {
        $this->enable();

        $discounted = $this->sell($this->appt(53), 53, $this->breakdown(53, 5));
        $plain = $this->sell($this->appt(53), 53, [['method' => 'cash', 'currency' => 'USD', 'inputAmount' => 53, 'amount' => 53]]);

        $this->assertEquals(21.2, $discounted->employee_amount);                       // 40 % de 53, no de 50,35
        $this->assertEquals($plain->employee_amount, $discounted->employee_amount);   // igual que sin descuento
        $this->assertEquals(53.0, $discounted->total_amount);                          // el valor de la venta
        $this->assertEquals(31.8, $discounted->local_amount);
        $this->assertEquals(40.0, $discounted->employee_percentage);
    }

    public function test_a_fixed_commission_is_not_changed_by_the_discount(): void
    {
        $this->enable();
        DB::table('services')->where('id', self::SERVICE)->update(['is_fixed_commission' => true, 'fixed_commission_amount' => 20]);

        $tx = $this->sell($this->appt(53), 53, $this->breakdown(53, 10));

        $this->assertEquals(20.0, $tx->employee_amount);
    }

    public function test_the_charge_keeps_the_discount_line_and_only_the_rest_is_money_collected(): void
    {
        $this->enable();

        $tx = $this->sell($this->appt(53), 53, $this->breakdown(53, 5));

        $this->assertSame('cash', $tx->method); // sigue siendo un cobro en efectivo, no «mixto»
        $this->assertSame(['cash', 'descuento'], array_column($tx->payments_breakdown, 'method'));
        $this->assertEquals(2.65, UncollectedAmount::of($tx->method, $tx->payments_breakdown));
        $this->assertEquals(50.35, $tx->total_amount - UncollectedAmount::of($tx->method, $tx->payments_breakdown));
    }

    public function test_the_appointment_is_paid_in_full_with_a_discount(): void
    {
        $this->enable();
        $appt = $this->appt(53);

        $this->sell($appt, 53, $this->breakdown(53, 5));

        $this->assertSame('paid', DB::table('appointments')->where('id', $appt)->value('payment_status'));
    }

    // ── Reglas del descuento ────────────────────────────────────────────────────

    public function test_it_is_refused_when_the_business_has_not_enabled_discounts(): void
    {
        $this->rejects(fn () => $this->sell($this->appt(53), 53, $this->breakdown(53, 5)), 'no están activados');
        $this->assertSame(0, Transaction::count());
    }

    public function test_a_discount_bigger_than_its_percentage_is_refused(): void
    {
        $this->enable();
        $big = [
            ['method' => 'cash', 'currency' => 'USD', 'inputAmount' => 3, 'amount' => 3],
            ['method' => 'descuento', 'currency' => 'USD', 'inputAmount' => 50, 'amount' => 50, 'percentage' => 5],
        ];

        $this->rejects(fn () => $this->sell($this->appt(53), 53, $big), 'no puede pasar del 5%');
        $this->assertSame(0, Transaction::count());
    }

    public function test_an_invalid_percentage_or_amount_is_refused(): void
    {
        $this->enable();
        $line = fn (float $amount, float $pct) => [
            ['method' => 'cash', 'currency' => 'USD', 'inputAmount' => 40, 'amount' => 40],
            ['method' => 'descuento', 'currency' => 'USD', 'inputAmount' => $amount, 'amount' => $amount, 'percentage' => $pct],
        ];

        foreach ([[2.65, 0], [0, 5], [2.65, 150]] as [$amount, $pct]) {
            $this->rejects(fn () => $this->sell($this->appt(53), 53, $line($amount, $pct)), 'no es válido');
        }
    }

    public function test_only_one_discount_line_is_allowed(): void
    {
        $this->enable();
        $two = [...$this->breakdown(53, 5), ['method' => 'descuento', 'currency' => 'USD', 'inputAmount' => 1, 'amount' => 1, 'percentage' => 5]];

        $this->rejects(fn () => $this->sell($this->appt(53), 53, $two), 'solo puede llevar un descuento');
    }

    public function test_a_cashea_sale_does_not_take_a_discount(): void
    {
        $this->enable();

        $this->rejects(
            fn () => $this->sell($this->appt(53), 53, $this->breakdown(53, 5), 'cashea', ['fee_percentage' => 10, 'down_payment_percentage' => 40]),
            'Cashea no admite descuento',
        );
    }

    public function test_a_product_only_sale_does_not_take_a_discount(): void
    {
        $this->enable();

        $this->rejects(fn () => app(PosService::class)->processDirectSale(
            totalAmount: 30, method: 'cash', products: [['product_id' => (string) Str::uuid(), 'quantity' => 1, 'unit_cost' => 30]],
            notes: null, exchangeRate: 1, paymentsBreakdown: $this->breakdown(30, 5), clientId: null, clientNameInput: null, clientPhoneInput: null,
            businessId: self::BIZ, branchId: null, createdBy: self::DOC,
        ), 'solo aplican a servicios');
    }

    public function test_without_a_discount_everything_is_as_before_even_if_discounts_are_off(): void
    {
        $tx = $this->sell($this->appt(53), 53, [['method' => 'cash', 'currency' => 'USD', 'inputAmount' => 53, 'amount' => 53]]);

        $this->assertEquals(21.2, $tx->employee_amount);
        $this->assertEquals(0.0, UncollectedAmount::of($tx->method, $tx->payments_breakdown));
    }

    // ── Crédito ─────────────────────────────────────────────────────────────────

    public function test_a_sale_on_credit_with_a_discount_owes_only_what_is_chargeable(): void
    {
        $this->enable();

        $tx = $this->sell($this->appt(53), 53, $this->breakdown(53, 5, 'credito'), 'credito');

        $credit = Credit::where('transaction_id', $tx->id)->first();
        $this->assertEquals(50.35, $credit->amount);    // se debe lo cobrable, no los $53
        $this->assertEquals(21.2, $tx->employee_amount); // la comisión sigue sobre los $53
        $this->assertEquals(50.35, (float) DB::table('daily_reports')->value('credit_usd')); // y el reporte diario anota ese crédito
    }

    public function test_a_mixed_payment_with_credit_and_a_discount_credits_only_its_credit_line(): void
    {
        $this->enable();
        $mixed = [
            ['method' => 'cash', 'currency' => 'USD', 'inputAmount' => 10, 'amount' => 10],
            ['method' => 'credito', 'currency' => 'USD', 'inputAmount' => 40.35, 'amount' => 40.35],
            ['method' => 'descuento', 'currency' => 'USD', 'inputAmount' => 2.65, 'amount' => 2.65, 'percentage' => 5],
        ];

        $tx = $this->sell($this->appt(53), 53, $mixed, 'mixed');

        $this->assertEquals(40.35, Credit::where('transaction_id', $tx->id)->value('amount'));
        $this->assertEquals(21.2, $tx->employee_amount);
        $this->assertEquals(43.0, UncollectedAmount::of($tx->method, $tx->payments_breakdown)); // 40,35 de crédito + 2,65 de descuento
    }

    // ── Varios servicios ────────────────────────────────────────────────────────

    public function test_a_direct_sale_of_several_services_splits_the_discount_and_each_commission_stays_on_its_price(): void
    {
        $this->enable();

        app(PosService::class)->processDirectServiceSale(
            serviceId: null, employeeId: null, assistantEmployeeId: null, clientId: self::CLIENT,
            serviceAmount: 100, method: 'cash', products: [], notes: null, exchangeRate: 1,
            paymentsBreakdown: $this->breakdown(100, 5), tipAmount: 0, businessId: self::BIZ, branchId: null, createdBy: self::DOC,
            services: [
                ['service_id' => self::SERVICE, 'employee_id' => self::DOC, 'price' => 70],
                ['service_id' => self::SERVICE2, 'employee_id' => self::DOC, 'price' => 30],
            ],
        );

        $this->assertSame(2, Transaction::count());
        $this->assertEquals(100.0, (float) Transaction::sum('total_amount'));
        $this->assertEquals(40.0, (float) Transaction::sum('employee_amount'));     // 40 % de 100, no de 95
        $discounts = Transaction::all()->map(fn ($t) => UncollectedAmount::of($t->method, $t->payments_breakdown));
        $this->assertEqualsWithDelta(5.0, $discounts->sum(), 0.02);
    }

    // ── Cuadre del Día ──────────────────────────────────────────────────────────

    public function test_the_daily_report_counts_only_what_was_collected(): void
    {
        $this->enable();
        $this->sell($this->appt(53), 53, $this->breakdown(53, 5));
        DB::table('transactions')->update(['paid_at' => '2026-11-05 16:00:00']);

        $r = app(DailyReportPosSummaryService::class)->summarize(self::BIZ, '2026-11-05');

        $this->assertSame(50.35, $r['fields']['cash_usd']);   // no 53: el descuento no es dinero
        $this->assertSame(0.0, $r['fields']['other_usd']);    // y tampoco cae en «Otro»
    }

    public function test_each_cashier_box_counts_only_what_was_collected(): void
    {
        $this->enable();
        $this->sell($this->appt(53), 53, $this->breakdown(53, 5));
        DB::table('transactions')->update(['paid_at' => '2026-11-05 16:00:00']);

        $r = app(DailyReportSummaryService::class)->summarize(self::BIZ, '2026-11-05', '2026-11-05');

        $box = collect($r['by_cashier'])->first();
        $this->assertSame(50.35, $box['usd_total']);
        $this->assertSame(['cash'], array_column($box['usd_items'], 'method'));
    }
}
