<?php

namespace Tests\Feature;

use App\Models\Credit;
use App\Models\Transaction;
use App\Services\PosService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

/**
 * Una cita que ya está cobrada por completo no se vuelve a cobrar. Caso real (12/11/2026): una clienta con dos servicios
 * en grupo (Secado $26 + Lavado $12 = $38) quedó con CUATRO cobros ($76) y la comisión de la especialista duplicada,
 * porque nada impedía enviar el mismo cobro otra vez (doble toque, dos pantallas, lista vieja). Esquema mínimo en SQLite.
 */
class DuplicateChargeGuardTest extends TestCase
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

        DB::table('businesses')->insert(['id' => self::BIZ, 'name' => 'Salón Luma', 'niche_type' => 'salon', 'features' => '{}']);
        DB::table('clients')->insert(['id' => self::CLIENT, 'business_id' => self::BIZ, 'full_name' => 'Ana Pérez', 'phone' => '0414-1']);
        DB::table('profiles')->insert(['id' => self::DOC, 'business_id' => self::BIZ, 'full_name' => 'Dra. Soto', 'role' => 'empleado', 'pay_percentage' => 40]);
        DB::table('services')->insert([
            ['id' => self::SERVICE, 'business_id' => self::BIZ, 'name' => 'Terapia de lenguaje', 'duration_minutes' => 50, 'price' => 120, 'local_percentage' => 60],
            ['id' => self::SERVICE2, 'business_id' => self::BIZ, 'name' => 'Psicopedagogía', 'duration_minutes' => 50, 'price' => 40, 'local_percentage' => 60],
        ]);
    }

    // ── Ayudantes ───────────────────────────────────────────────────────────────

    private function appt(float $price, ?string $service = null): string
    {
        $id = (string) Str::uuid();
        DB::table('appointments')->insert([
            'id' => $id, 'business_id' => self::BIZ, 'client_id' => self::CLIENT, 'employee_id' => self::DOC, 'service_id' => $service ?? self::SERVICE,
            'start_time' => '2026-11-12 15:00:00', 'end_time' => '2026-11-12 15:50:00', 'status' => 'completed', 'price_override' => $price,
        ]);

        return $id;
    }

    private function charge(string $appointmentId, float $amount, string $method = 'punto_venta'): Transaction
    {
        $id = app(PosService::class)->processSale(
            appointmentId: $appointmentId, serviceAmount: $amount, method: $method, products: [], notes: null, exchangeRate: 1,
            paymentsBreakdown: [['method' => $method, 'currency' => 'USD', 'inputAmount' => $amount, 'amount' => $amount]],
            tipAmount: 0, businessId: self::BIZ, createdBy: self::DOC,
        );

        return Transaction::find($id);
    }

    private function refused(callable $call): void
    {
        try {
            $call();
            $this->fail('Debió rechazar el cobro repetido');
        } catch (RuntimeException $e) {
            $this->assertSame(PosService::ALREADY_CHARGED, $e->getMessage());
        }
    }

    // ── El cobro repetido ───────────────────────────────────────────────────────

    public function test_charging_a_paid_appointment_again_is_refused_and_creates_nothing(): void
    {
        $appt = $this->appt(38);
        $this->charge($appt, 38);

        $this->refused(fn () => $this->charge($appt, 38));

        $this->assertSame(1, Transaction::count());
        $this->assertEquals(38.0, (float) Transaction::sum('total_amount'));
        $this->assertEquals(15.2, (float) Transaction::sum('employee_amount')); // la comisión no se duplica
    }

    public function test_a_two_service_group_charged_twice_keeps_only_its_first_charges(): void
    {
        // El caso real: Secado $26 + Lavado $12, cobrados juntos y luego otra vez.
        $secado = $this->appt(26);
        $lavado = $this->appt(12, self::SERVICE2);
        $this->charge($secado, 26);
        $this->charge($lavado, 12);

        $this->refused(fn () => $this->charge($lavado, 12));
        $this->refused(fn () => $this->charge($secado, 26));

        $this->assertSame(2, Transaction::count());
        $this->assertEquals(38.0, (float) Transaction::sum('total_amount')); // no $76
    }

    public function test_the_refusal_does_not_change_the_appointment(): void
    {
        $appt = $this->appt(38);
        $this->charge($appt, 38);

        $this->refused(fn () => $this->charge($appt, 38));

        $this->assertSame('paid', DB::table('appointments')->where('id', $appt)->value('payment_status'));
    }

    public function test_other_appointments_are_not_affected(): void
    {
        $first = $this->appt(38);
        $second = $this->appt(38);
        $this->charge($first, 38);

        $this->charge($second, 38);

        $this->assertSame(2, Transaction::count());
    }

    public function test_the_same_guard_applies_whatever_the_payment_method(): void
    {
        foreach (['cash', 'zelle', 'pago_movil', 'cortesia', 'credito'] as $method) {
            $appt = $this->appt(20);
            $this->charge($appt, 20, $method);

            $this->refused(fn () => $this->charge($appt, 20, 'cash'));
        }
        $this->assertSame(5, Transaction::count());
    }

    public function test_a_sale_on_credit_counts_as_charged_so_it_cannot_be_charged_again(): void
    {
        $appt = $this->appt(50);
        $this->charge($appt, 50, 'credito');

        $this->refused(fn () => $this->charge($appt, 50, 'cash'));

        $this->assertSame(1, Credit::count());
        $this->assertSame(1, Transaction::count());
    }

    // ── Lo legítimo sigue funcionando ───────────────────────────────────────────

    public function test_a_partial_charge_can_be_completed_later(): void
    {
        $appt = $this->appt(100);
        $this->charge($appt, 60);

        $this->charge($appt, 40);

        $this->assertSame(2, Transaction::count());
        $this->assertSame('paid', DB::table('appointments')->where('id', $appt)->value('payment_status'));
        // Y ahora sí está completa: un tercer cobro se rechaza.
        $this->refused(fn () => $this->charge($appt, 40));
    }

    public function test_a_price_raised_after_paying_allows_charging_only_the_difference(): void
    {
        $appt = $this->appt(38);
        $this->charge($appt, 38);
        DB::table('appointments')->where('id', $appt)->update(['price_override' => 50]);

        $this->charge($appt, 12);

        $this->assertSame(2, Transaction::count());
        $this->assertEquals(50.0, (float) Transaction::sum('total_amount'));
    }

    public function test_a_charge_of_zero_service_amount_is_not_blocked_by_the_guard(): void
    {
        // Un cobro sin monto de servicio (solo propina o productos) no es un cobro repetido del servicio.
        $appt = $this->appt(38);
        $this->charge($appt, 38);

        $id = app(PosService::class)->processSale(
            appointmentId: $appt, serviceAmount: 0, method: 'cash', products: [], notes: null, exchangeRate: 1,
            paymentsBreakdown: [['method' => 'cash', 'currency' => 'USD', 'inputAmount' => 5, 'amount' => 5]],
            tipAmount: 5, businessId: self::BIZ, createdBy: self::DOC,
        );

        $this->assertNotEmpty($id);
    }
}
