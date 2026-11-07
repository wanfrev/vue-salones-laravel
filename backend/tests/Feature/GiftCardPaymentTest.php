<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\GiftCardController;
use App\Models\GiftCard;
use App\Models\GiftCardPayment;
use App\Services\DailyReportPosSummaryService;
use App\Services\DailyReportSummaryService;
use App\Services\GiftCardPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tests\TestCase;

/**
 * Cómo se pagó una gift card al venderla: dinero recibido (entra al Cuadre del Día) que NO es ingreso de Finanzas.
 * SQLite en memoria.
 */
class GiftCardPaymentTest extends TestCase
{
    private const BIZ = '11111111-1111-4111-8111-111111111111';
    private const OTHER = '22222222-2222-4222-8222-222222222222';
    private const ADMIN = 'aaaaaaaa-0001-4000-8000-000000000001';
    private const CAJERA = 'aaaaaaaa-0002-4000-8000-000000000002';
    private const BANESCO = 'bbbbbbbb-0000-4000-8000-000000000001';
    private const AJENO = 'bbbbbbbb-0000-4000-8000-000000000002';

    protected function setUp(): void
    {
        parent::setUp();

        // 6 de noviembre de 2026, 10:00 a. m. en Caracas (UTC-4)
        Carbon::setTestNow('2026-11-06 14:00:00');

        Schema::dropAllTables();
        Schema::create('businesses', function ($t) {
            $t->string('id')->primary();
            $t->string('timezone')->nullable();
            $t->decimal('ves_exchange_rate', 12, 4)->nullable();
            $t->text('features')->nullable();
        });
        Schema::create('profiles', function ($t) {
            $t->string('id')->primary();
            $t->string('full_name')->nullable();
        });
        Schema::create('banks', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('name');
            $t->timestamps();
        });
        Schema::create('gift_cards', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('branch_id')->nullable();
            $t->string('code')->nullable();
            $t->string('buyer_name')->nullable();
            $t->string('buyer_phone')->nullable();
            $t->string('recipient_name');
            $t->string('recipient_phone')->nullable();
            $t->decimal('amount', 12, 2);
            $t->string('status')->default('active');
            $t->text('notes')->nullable();
            $t->dateTime('redeemed_at')->nullable();
            $t->string('created_by')->nullable();
            $t->timestamps();
        });
        Schema::create('gift_card_payments', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('branch_id')->nullable();
            $t->string('gift_card_id')->unique();
            $t->decimal('amount', 12, 2);
            $t->text('payments_breakdown');
            $t->decimal('exchange_rate', 12, 4)->nullable();
            $t->dateTime('paid_at');
            $t->string('created_by')->nullable();
            $t->timestamps();
        });
        Schema::create('transactions', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('branch_id')->nullable();
            $t->string('appointment_id')->nullable();
            $t->decimal('total_amount', 12, 2)->default(0);
            $t->decimal('tip_amount', 12, 2)->default(0);
            $t->string('method')->nullable();
            $t->decimal('exchange_rate_used', 12, 4)->nullable();
            $t->text('payments_breakdown')->nullable();
            $t->string('paid_at')->nullable();
            $t->string('created_by')->nullable();
            $t->text('notes')->nullable();
            $t->dateTime('created_at')->nullable();
        });
        Schema::create('appointments', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('client_id')->nullable();
        });
        Schema::create('clients', function ($t) {
            $t->string('id')->primary();
            $t->string('full_name')->nullable();
        });
        Schema::create('branches', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id')->nullable();
            $t->decimal('ves_exchange_rate', 12, 4)->nullable();
        });
        Schema::create('daily_reports', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('branch_id')->nullable();
            $t->date('date');
        });

        DB::table('businesses')->insert([
            ['id' => self::BIZ, 'timezone' => 'America/Caracas', 'ves_exchange_rate' => 100, 'features' => '{}'],
            ['id' => self::OTHER, 'timezone' => 'America/Caracas', 'ves_exchange_rate' => 100, 'features' => '{}'],
        ]);
        DB::table('profiles')->insert([
            ['id' => self::ADMIN, 'full_name' => 'Wanfredo Admin'],
            ['id' => self::CAJERA, 'full_name' => 'Camila Cajera'],
        ]);
        DB::table('banks')->insert([
            ['id' => self::BANESCO, 'business_id' => self::BIZ, 'name' => 'Banesco'],
            ['id' => self::AJENO, 'business_id' => self::OTHER, 'name' => 'Mercantil'],
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    // ── Utilidades ───────────────────────────────────────────────────────────

    private function service(): GiftCardPaymentService
    {
        return app(GiftCardPaymentService::class);
    }

    /** Un usuario falso con perfil (el controlador hace `$request->user()->load('profile')`). */
    private function requestAs(string $userId = self::CAJERA, string $business = self::BIZ, string $role = 'admin'): Request
    {
        $user = new class ($userId, $business, $role) {
            public $profile;

            public function __construct(public string $id, string $business, string $role)
            {
                $this->profile = (object) ['business_id' => $business, 'role' => $role];
            }

            public function load($relations)
            {
                return $this;
            }
        };

        $request = Request::create('/gift-cards', 'POST');
        $request->setUserResolver(fn () => $user);

        return $request;
    }

    private function send(string $action, array $body, ?string $id = null, string $userId = self::CAJERA, string $business = self::BIZ, string $role = 'admin'): JsonResponse
    {
        $request = $this->requestAs($userId, $business, $role);
        $request->request->add($body);
        $request->setMethod('POST');
        $controller = app(GiftCardController::class);

        return $id === null ? $controller->$action($request) : $controller->$action($request, $id);
    }

    private function newCard(array $over = []): GiftCard
    {
        return GiftCard::create(array_merge([
            'id' => sprintf('cccccccc-0000-4000-8000-%012d', random_int(1, 999999999)), 'business_id' => self::BIZ,
            'recipient_name' => 'Carmen de Borrego', 'amount' => 50, 'status' => 'active', 'created_by' => self::ADMIN,
        ], $over));
    }

    private function lines(array ...$lines): array
    {
        return ['lines' => $lines];
    }

    // ── Validación del cobro ────────────────────────────────────────────────

    public function test_cash_in_dollars_is_kept_as_is(): void
    {
        $r = $this->service()->normalize(self::BIZ, [['method' => 'cash', 'input_amount' => 50]], null);

        $this->assertSame(50.0, $r['total']);
        $this->assertNull($r['rate']);
        $this->assertSame([['method' => 'cash', 'currency' => 'USD', 'inputAmount' => 50.0, 'amount' => 50.0]], $r['splits']);
    }

    public function test_bolivar_methods_are_typed_in_bs_and_converted_with_the_rate(): void
    {
        $r = $this->service()->normalize(self::BIZ, [['method' => 'pago_movil', 'input_amount' => 5000, 'bank_id' => self::BANESCO]], 100.0);

        $this->assertSame(50.0, $r['total']);
        $this->assertSame(100.0, $r['rate']);
        $this->assertSame('VES', $r['splits'][0]['currency']);
        $this->assertSame(5000.0, $r['splits'][0]['inputAmount']);
        $this->assertSame(50.0, $r['splits'][0]['amount']);
        $this->assertSame('Banesco', $r['splits'][0]['bank_name']); // resuelto desde la tabla, no del cliente
    }

    public function test_a_mixed_payment_adds_up_every_line(): void
    {
        $r = $this->service()->normalize(self::BIZ, [
            ['method' => 'cash', 'input_amount' => 20],
            ['method' => 'zelle', 'input_amount' => 10],
            ['method' => 'cash_ves', 'input_amount' => 2000],
        ], 100.0);

        $this->assertSame(50.0, $r['total']);
        $this->assertCount(3, $r['splits']);
    }

    public function test_a_bank_only_applies_to_bank_methods_and_must_be_the_business_own(): void
    {
        $cash = $this->service()->normalize(self::BIZ, [['method' => 'cash', 'input_amount' => 5, 'bank_id' => self::BANESCO]], null);
        $this->assertArrayNotHasKey('bank_name', $cash['splits'][0]);

        $this->expectException(InvalidArgumentException::class);
        $this->service()->normalize(self::BIZ, [['method' => 'transfer', 'input_amount' => 500, 'bank_id' => self::AJENO]], 100.0);
    }

    public function test_invalid_lines_are_rejected(): void
    {
        $bad = [
            [[], 'Indica cómo se pagó'],
            [[['method' => 'credito', 'input_amount' => 5]], 'Método de pago no válido'],
            [[['method' => 'cortesia', 'input_amount' => 5]], 'Método de pago no válido'],
            [[['method' => 'gift_card', 'input_amount' => 5]], 'Método de pago no válido'],
            [[['method' => 'cash', 'input_amount' => 0]], 'monto mayor a 0'],
            [[['method' => 'cash', 'input_amount' => -3]], 'monto mayor a 0'],
            [[['method' => 'pago_movil', 'input_amount' => 500]], 'tasa de cambio'],
        ];

        foreach ($bad as [$lines, $message]) {
            try {
                $this->service()->normalize(self::BIZ, $lines, null);
                $this->fail('Debió rechazar '.json_encode($lines));
            } catch (InvalidArgumentException $e) {
                $this->assertStringContainsString($message, $e->getMessage());
            }
        }
    }

    public function test_the_payment_has_to_cover_the_gift_card_amount(): void
    {
        $this->service()->assertCovers(50.0, 50.0);
        $this->service()->assertCovers(49.99, 50.0); // redondeo de la tasa
        $this->expectException(InvalidArgumentException::class);
        $this->service()->assertCovers(40.0, 50.0);
    }

    // ── Crear la gift card con su cobro ─────────────────────────────────────

    public function test_creating_a_gift_card_with_its_payment_saves_both(): void
    {
        $res = $this->send('store', [
            'recipient_name' => 'Carmen de Borrego', 'buyer_name' => 'Veronica Valbuena', 'amount' => 50,
            'payment' => $this->lines(['method' => 'cash', 'input_amount' => 50]),
        ]);

        $this->assertSame(201, $res->getStatusCode());
        $this->assertSame(1, GiftCard::count());
        $payment = GiftCardPayment::first();
        $this->assertSame(50.0, $payment->amount);
        $this->assertSame(self::CAJERA, $payment->created_by);
        $this->assertSame('cash', $payment->payments_breakdown[0]['method']);
        $this->assertSame(GiftCard::first()->id, $payment->gift_card_id);
        $this->assertSame('2026-11-06 14:00:00', $payment->paid_at->format('Y-m-d H:i:s'));
    }

    public function test_a_payment_that_does_not_match_creates_nothing(): void
    {
        $res = $this->send('store', [
            'recipient_name' => 'Carmen', 'amount' => 50,
            'payment' => $this->lines(['method' => 'cash', 'input_amount' => 40]),
        ]);

        $this->assertSame(422, $res->getStatusCode());
        $this->assertStringContainsString('no coincide', json_decode($res->getContent(), true)['message']);
        $this->assertSame(0, GiftCard::count());
        $this->assertSame(0, GiftCardPayment::count());
    }

    public function test_an_invalid_payment_creates_nothing(): void
    {
        $res = $this->send('store', [
            'recipient_name' => 'Carmen', 'amount' => 50,
            'payment' => $this->lines(['method' => 'pago_movil', 'input_amount' => 5000]) + ['exchange_rate' => 0],
        ]);

        // Sin tasa en la petición se usa la del negocio (100): 5.000 Bs = $50.
        $this->assertSame(201, $res->getStatusCode());

        DB::table('businesses')->where('id', self::BIZ)->update(['ves_exchange_rate' => null]);
        $res = $this->send('store', [
            'recipient_name' => 'Otra', 'amount' => 50,
            'payment' => $this->lines(['method' => 'pago_movil', 'input_amount' => 5000]),
        ]);
        $this->assertSame(422, $res->getStatusCode());
        $this->assertSame(1, GiftCard::count());
    }

    public function test_without_a_payment_a_gift_card_is_created_as_always(): void
    {
        $res = $this->send('store', ['recipient_name' => 'Carmen', 'amount' => 50]);

        $this->assertSame(201, $res->getStatusCode());
        $this->assertSame(1, GiftCard::count());
        $this->assertSame(0, GiftCardPayment::count());
    }

    // ── Registrar el cobro después ──────────────────────────────────────────

    public function test_the_payment_can_be_registered_later_on_an_existing_card(): void
    {
        $card = $this->newCard();

        $res = $this->send('savePayment', $this->lines(['method' => 'cash', 'input_amount' => 50]), $card->id);

        $this->assertSame(200, $res->getStatusCode());
        $this->assertSame(1, GiftCardPayment::count());
        $this->assertSame('cash', json_decode($res->getContent(), true)['payment']['payments_breakdown'][0]['method']);
    }

    public function test_a_later_payment_can_be_for_less_than_the_remaining_balance(): void
    {
        // La gift card ya se usó en parte: su monto es el saldo, no lo que se pagó.
        $card = $this->newCard(['amount' => 29]);

        $res = $this->send('savePayment', $this->lines(['method' => 'zelle', 'input_amount' => 50]), $card->id);

        $this->assertSame(200, $res->getStatusCode());
        $this->assertSame(50.0, GiftCardPayment::first()->amount);
    }

    public function test_registering_again_replaces_the_payment_instead_of_adding_another(): void
    {
        $card = $this->newCard();
        $this->send('savePayment', $this->lines(['method' => 'cash', 'input_amount' => 50]), $card->id);

        $this->send('savePayment', $this->lines(['method' => 'zelle', 'input_amount' => 50]), $card->id);

        $this->assertSame(1, GiftCardPayment::count());
        $this->assertSame('zelle', GiftCardPayment::first()->payments_breakdown[0]['method']);
    }

    public function test_the_payment_can_be_removed_and_the_card_stays(): void
    {
        $card = $this->newCard();
        $this->send('savePayment', $this->lines(['method' => 'cash', 'input_amount' => 50]), $card->id);

        $res = $this->send('removePayment', [], $card->id);

        $this->assertSame(204, $res->getStatusCode());
        $this->assertSame(0, GiftCardPayment::count());
        $this->assertSame(1, GiftCard::count());
    }

    public function test_another_business_gift_card_cannot_be_touched(): void
    {
        $card = $this->newCard(['business_id' => self::OTHER]);

        foreach (['savePayment', 'removePayment'] as $action) {
            try {
                $this->send($action, $this->lines(['method' => 'cash', 'input_amount' => 50]), $card->id);
                $this->fail("$action debió rechazarse");
            } catch (NotFoundHttpException) {
                $this->addToAssertionCount(1);
            }
        }
        $this->assertSame(0, GiftCardPayment::count());
    }

    public function test_a_different_payment_date_follows_the_pos_rule(): void
    {
        $card = $this->newCard();
        $body = $this->lines(['method' => 'cash', 'input_amount' => 50]) + ['paid_date' => '2026-11-04'];

        // Sin la opción activada, o sin ser admin/encargado, se rechaza.
        $this->assertSame(403, $this->send('savePayment', $body, $card->id)->getStatusCode());

        DB::table('businesses')->where('id', self::BIZ)->update(['features' => '{"pos_backdate_enabled":true}']);
        $this->assertSame(403, $this->send('savePayment', $body, $card->id, self::CAJERA, self::BIZ, 'cajero')->getStatusCode());

        $this->assertSame(200, $this->send('savePayment', $body, $card->id)->getStatusCode());
        $this->assertSame('2026-11-04', GiftCardPayment::first()->paid_at->setTimezone('America/Caracas')->format('Y-m-d'));

        // Una fecha futura nunca.
        $future = $this->lines(['method' => 'cash', 'input_amount' => 50]) + ['paid_date' => '2026-11-09'];
        $this->assertSame(422, $this->send('savePayment', $future, $card->id)->getStatusCode());
    }

    public function test_the_list_comes_with_each_payment(): void
    {
        $paid = $this->newCard(['code' => 'GC-PAID']);
        $this->newCard(['code' => 'GC-FREE']);
        $this->send('savePayment', $this->lines(['method' => 'cash', 'input_amount' => 50]), $paid->id);

        $request = $this->requestAs();
        $rows = collect(json_decode(app(GiftCardController::class)->index($request)->getContent(), true))->keyBy('code');

        $this->assertSame(50, $rows['GC-PAID']['payment']['amount']);
        $this->assertNull($rows['GC-FREE']['payment']);
    }

    // ── Cuadre del Día ───────────────────────────────────────────────────────

    private function pay(array $lines, string $paidAtUtc, string $user = self::CAJERA, string $business = self::BIZ, ?string $branch = null): void
    {
        $card = $this->newCard(['business_id' => $business, 'branch_id' => $branch]);
        $normalized = $this->service()->normalize($business, $lines, 100.0);
        $this->service()->save($card, $normalized, Carbon::parse($paidAtUtc), $user);
    }

    public function test_the_pos_summary_of_the_day_counts_the_gift_card_money_by_method_and_currency(): void
    {
        $this->pay([['method' => 'cash', 'input_amount' => 50]], '2026-11-06 15:00:00');
        $this->pay([['method' => 'pago_movil', 'input_amount' => 5000]], '2026-11-06 16:00:00');
        $this->pay([['method' => 'zelle', 'input_amount' => 20]], '2026-11-06 17:00:00');

        $r = app(DailyReportPosSummaryService::class)->summarize(self::BIZ, '2026-11-06');

        $this->assertSame(50.0, $r['fields']['cash_usd']);
        $this->assertSame(5000.0, $r['fields']['pago_movil_bs']);
        $this->assertSame(20.0, $r['fields']['zelle_usd']);
        $this->assertSame(120.0, $r['meta']['gift_card_sales']); // 50 + 50 (5.000 Bs a 100) + 20
    }

    public function test_the_gift_card_money_goes_to_the_day_it_was_received_in_the_business_timezone(): void
    {
        $this->pay([['method' => 'cash', 'input_amount' => 50]], '2026-11-06 03:00:00');   // 5/nov 23:00 en Caracas
        $this->pay([['method' => 'cash', 'input_amount' => 30]], '2026-11-07 03:59:00');   // 6/nov 23:59
        $this->pay([['method' => 'cash', 'input_amount' => 99]], '2026-11-07 04:00:00');   // 7/nov 00:00

        $day = app(DailyReportPosSummaryService::class)->summarize(self::BIZ, '2026-11-06');

        $this->assertSame(30.0, $day['fields']['cash_usd']);
    }

    public function test_the_pos_summary_only_counts_its_own_business_and_branch(): void
    {
        $branchA = 'dddddddd-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
        $branchB = 'dddddddd-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
        $this->pay([['method' => 'cash', 'input_amount' => 50]], '2026-11-06 15:00:00', self::CAJERA, self::OTHER);
        $this->pay([['method' => 'cash', 'input_amount' => 10]], '2026-11-06 15:00:00', self::CAJERA, self::BIZ, $branchA);
        $this->pay([['method' => 'cash', 'input_amount' => 20]], '2026-11-06 15:00:00', self::CAJERA, self::BIZ, $branchB);
        $this->pay([['method' => 'cash', 'input_amount' => 5]], '2026-11-06 15:00:00', self::CAJERA, self::BIZ, null);

        $all = app(DailyReportPosSummaryService::class)->summarize(self::BIZ, '2026-11-06');
        $a = app(DailyReportPosSummaryService::class)->summarize(self::BIZ, '2026-11-06', $branchA);

        $this->assertSame(35.0, $all['fields']['cash_usd']);
        $this->assertSame(15.0, $a['fields']['cash_usd']); // su sucursal + las que no tienen
    }

    public function test_the_bank_breakdown_and_each_cashier_box_include_the_gift_cards_they_collected(): void
    {
        $this->pay([['method' => 'pago_movil', 'input_amount' => 5000, 'bank_id' => self::BANESCO]], '2026-11-06 15:00:00', self::CAJERA);
        $this->pay([['method' => 'cash', 'input_amount' => 40], ['method' => 'transfer', 'input_amount' => 1000]], '2026-11-06 16:00:00', self::ADMIN);

        $r = app(DailyReportSummaryService::class)->summarize(self::BIZ, '2026-11-06', '2026-11-06');

        $this->assertSame([['name' => 'Banesco', 'amount_bs' => 5000.0]], $r['banks']['pago_movil_bs']);

        $byUser = collect($r['by_cashier'])->keyBy('name');
        $this->assertSame(5000.0, $byUser['Camila Cajera']['ves_total']);
        $this->assertSame(40.0, $byUser['Wanfredo Admin']['usd_total']);
        $this->assertSame(1000.0, $byUser['Wanfredo Admin']['ves_total']);
        $this->assertSame('cash', $byUser['Wanfredo Admin']['usd_items'][0]['method']);
    }

    public function test_gift_card_money_is_not_income_so_no_transaction_is_created(): void
    {
        $this->send('store', [
            'recipient_name' => 'Carmen', 'amount' => 50,
            'payment' => $this->lines(['method' => 'cash', 'input_amount' => 50]),
        ]);

        // Finanzas lee `transactions`: la venta de una gift card nunca crea una (el ingreso se reconoce al usarla).
        $this->assertSame(0, DB::table('transactions')->count());
    }
}
