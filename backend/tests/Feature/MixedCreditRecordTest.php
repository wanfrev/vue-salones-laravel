<?php

namespace Tests\Feature;

use App\Models\Credit;
use App\Services\InventoryService;
use App\Services\PosService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Mockery;
use ReflectionMethod;
use Tests\TestCase;

/**
 * Un pago mixto con una parte a crédito (Paula Gallegos: $14,01 con gift card + $100,99 a crédito)
 * debe aparecer en la pestaña Créditos, por el monto que quedó a crédito. SQLite en memoria.
 */
class MixedCreditRecordTest extends TestCase
{
    private const BIZ = '11111111-1111-4111-8111-111111111111';

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-10-28 12:00:00');

        Schema::dropAllTables();
        Schema::create('clients', function ($t) {
            $t->string('id')->primary();
            $t->string('full_name')->nullable();
            $t->string('phone')->nullable();
        });
        Schema::create('appointments', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('client_id')->nullable();
        });
        Schema::create('transactions', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('branch_id')->nullable();
            $t->string('appointment_id')->nullable();
            $t->decimal('total_amount', 12, 2)->default(0);
            $t->string('method');
            $t->text('payments_breakdown')->nullable();
            $t->string('paid_at')->nullable();
            $t->string('created_by')->nullable();
            $t->text('notes')->nullable();
            $t->dateTime('created_at')->nullable();
        });
        Schema::create('credits', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('branch_id')->nullable();
            $t->string('client_id')->nullable();
            $t->string('client_name');
            $t->string('client_phone')->nullable();
            $t->string('transaction_id')->unique();
            $t->decimal('amount', 12, 2);
            $t->decimal('paid_amount', 12, 2)->default(0);
            $t->string('currency')->default('USD');
            $t->string('status')->default('pending');
            $t->dateTime('paid_at')->nullable();
            $t->string('paid_method')->nullable();
            $t->string('created_by')->nullable();
            $t->timestamps();
        });

        DB::table('clients')->insert(['id' => 'c-paula', 'full_name' => 'PAULA GALLEGOS', 'phone' => '+584126875313']);
        DB::table('appointments')->insert(['id' => 'a-paula', 'business_id' => self::BIZ, 'client_id' => 'c-paula']);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        Mockery::close();
        parent::tearDown();
    }

    private function tx(string $id, string $method, array $breakdown, float $total = 115.0, ?string $paidAt = '2026-10-23 15:00:00'): void
    {
        DB::table('transactions')->insert([
            'id' => $id, 'business_id' => self::BIZ, 'appointment_id' => 'a-paula', 'total_amount' => $total,
            'method' => $method, 'payments_breakdown' => json_encode($breakdown), 'paid_at' => $paidAt,
            'created_at' => '2026-10-23 15:00:00',
        ]);
    }

    private const PAULA = [
        ['method' => 'gift_card', 'currency' => 'USD', 'amount' => 14.01],
        ['method' => 'credito', 'currency' => 'USD', 'amount' => 100.99],
    ];

    // ── Qué parte de la venta quedó a crédito ─────────────────────────────────────────────

    public function test_credit_portion(): void
    {
        $this->assertSame(115.0, PosService::creditPortion('credito', 115.0, []));
        $this->assertSame(100.99, PosService::creditPortion('mixed', 115.0, self::PAULA));
        $this->assertSame(0.0, PosService::creditPortion('mixed', 115.0, [['method' => 'zelle', 'amount' => 115]]));
        $this->assertSame(0.0, PosService::creditPortion('zelle', 115.0, self::PAULA), 'otro método no genera crédito');
        $this->assertSame(30.0, PosService::creditPortion('mixed', 100.0, [['method' => 'credito', 'amount' => 10], ['method' => 'credito', 'inputAmount' => 20]]));
    }

    private function createRecord(string $method, array $breakdown, float $total = 115.0): void
    {
        $service = new PosService(Mockery::mock(InventoryService::class));
        (new ReflectionMethod($service, 'createCreditRecord'))->invoke(
            $service, self::BIZ, null, $method, $total, 'c-paula', 'PAULA GALLEGOS', '+584126875313', 'tx-1', 'user-1', null, $breakdown,
        );
    }

    public function test_a_mixed_sale_with_a_credit_part_creates_a_credit_for_that_part(): void
    {
        $this->createRecord('mixed', self::PAULA);

        $credit = Credit::first();
        $this->assertSame(100.99, $credit->amount);
        $this->assertSame('pending', $credit->status);
        $this->assertSame('PAULA GALLEGOS', $credit->client_name);
    }

    public function test_a_full_credit_sale_still_creates_a_credit_for_the_whole_amount(): void
    {
        $this->createRecord('credito', [], 17.0);

        $this->assertSame(17.0, Credit::first()->amount);
    }

    public function test_sales_without_a_credit_part_create_none(): void
    {
        $this->createRecord('mixed', [['method' => 'zelle', 'amount' => 115]]);
        $this->createRecord('zelle', [['method' => 'zelle', 'amount' => 115]]);

        $this->assertSame(0, Credit::count());
    }

    // ── Recuperar los que ya se hicieron ──────────────────────────────────────────────────

    public function test_backfill_dry_run_lists_without_writing(): void
    {
        $this->tx('tx-paula', 'mixed', self::PAULA);

        Artisan::call('credits:backfill-mixed');
        $out = Artisan::output();

        $this->assertStringContainsString('PAULA GALLEGOS', $out);
        $this->assertStringContainsString('$100.99', $out);
        $this->assertSame(0, Credit::count(), 'sin --apply no se escribe nada');
    }

    public function test_backfill_creates_the_missing_credit_on_the_day_of_the_sale_and_is_repeatable(): void
    {
        $this->tx('tx-paula', 'mixed', self::PAULA);
        $this->tx('tx-solo-giftcard', 'mixed', [['method' => 'gift_card', 'amount' => 14], ['method' => 'zelle', 'amount' => 101]]);
        $this->tx('tx-credito-puro', 'credito', [['method' => 'credito', 'amount' => 17]], 17.0);
        $this->tx('tx-ya-tiene', 'mixed', self::PAULA);
        DB::table('credits')->insert([
            'id' => 'cr-1', 'business_id' => self::BIZ, 'client_name' => 'x', 'transaction_id' => 'tx-ya-tiene', 'amount' => 100.99,
            'created_at' => '2026-10-23 15:00:00', 'updated_at' => '2026-10-23 15:00:00',
        ]);

        Artisan::call('credits:backfill-mixed', ['--apply' => true]);

        $this->assertSame(2, Credit::count(), 'el que ya existía + el de Paula; nada más');
        $credit = Credit::where('transaction_id', 'tx-paula')->first();
        $this->assertSame(100.99, $credit->amount);
        $this->assertSame('PAULA GALLEGOS', $credit->client_name);
        $this->assertSame('c-paula', $credit->client_id);
        $this->assertSame('2026-10-23', $credit->created_at->toDateString(), 'queda en el día de la venta (la pestaña filtra por esa fecha)');

        Artisan::call('credits:backfill-mixed', ['--apply' => true]);
        $this->assertSame(2, Credit::count(), 'repetirlo no duplica');
    }
}
