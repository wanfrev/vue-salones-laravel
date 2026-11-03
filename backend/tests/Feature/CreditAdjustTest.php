<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\CreditController;
use App\Models\Credit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/**
 * Un crédito sin pagar se puede corregir (monto mal cargado), cerrar (dar por cobrado el saldo) o eliminar aunque ya
 * tenga abonos. Nada de eso crea ingresos: las Transaction de los abonos ya cobrados no se tocan. SQLite en memoria.
 */
class CreditAdjustTest extends TestCase
{
    private const BIZ = '11111111-1111-4111-8111-111111111111';
    private const OTHER = '22222222-2222-4222-8222-222222222222';

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropAllTables();
        Schema::create('clients', function ($t) {
            $t->string('id')->primary();
            $t->string('full_name')->nullable();
            $t->string('phone')->nullable();
        });
        Schema::create('transactions', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->decimal('total_amount', 12, 2)->default(0);
            $t->string('method');
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
            $t->decimal('original_amount', 12, 2)->nullable();
            $t->decimal('paid_amount', 12, 2)->default(0);
            $t->string('currency')->default('USD');
            $t->string('status')->default('pending');
            $t->dateTime('paid_at')->nullable();
            $t->string('paid_method')->nullable();
            $t->string('created_by')->nullable();
            $t->timestamps();
        });
    }

    private function credit(string $id, float $amount, float $paid = 0.0, ?float $saleTotal = null, string $business = self::BIZ): Credit
    {
        DB::table('transactions')->insert(['id' => "tx-$id", 'business_id' => $business, 'total_amount' => $saleTotal ?? $amount, 'method' => 'credito']);

        return Credit::create([
            'id' => $id, 'business_id' => $business, 'client_name' => 'EMILIANA', 'transaction_id' => "tx-$id",
            'amount' => $amount, 'paid_amount' => $paid, 'currency' => 'USD', 'status' => $paid > 0 ? 'partial' : 'pending',
        ]);
    }

    private function request(string $id, string $method, array $body = [], string $business = self::BIZ): Request
    {
        return Request::create("/credits/$id?business_id=$business", $method, $body);
    }

    private function update(string $id, array $body, string $business = self::BIZ): \Illuminate\Http\JsonResponse
    {
        return (new CreditController())->update($this->request($id, 'PUT', $body, $business), $id);
    }

    private function close(string $id, string $business = self::BIZ): \Illuminate\Http\JsonResponse
    {
        return (new CreditController())->close($this->request($id, 'POST', [], $business), $id);
    }

    private function destroyCredit(string $id, string $business = self::BIZ): \Illuminate\Http\JsonResponse
    {
        return (new CreditController())->destroy($this->request($id, 'DELETE', [], $business), $id);
    }

    private function row(string $id): ?Credit
    {
        return Credit::with('transaction:id,total_amount')->find($id);
    }

    // ── cerrar ──────────────────────────────────────────────────────────────

    public function test_closing_a_credit_with_payments_marks_it_paid_for_what_was_collected(): void
    {
        $this->credit('emi', 216.00, 133.00);

        $res = $this->close('emi');

        $this->assertSame(200, $res->getStatusCode());
        $c = $this->row('emi');
        $this->assertSame('paid', $c->status);
        $this->assertEquals(133.00, $c->amount);
        $this->assertEquals(133.00, $c->paid_amount);
        $this->assertEquals(0.0, $c->remaining);
        $this->assertSame('closed', $c->paid_method);
        $this->assertNotNull($c->paid_at);
        $this->assertEquals(216.00, $c->original_amount);
    }

    public function test_closing_creates_no_income(): void
    {
        $this->credit('emi', 216.00, 133.00);

        $this->close('emi');

        $this->assertSame(1, DB::table('transactions')->count());
        $this->assertSame('credito', DB::table('transactions')->value('method'));
    }

    public function test_a_credit_without_payments_cannot_be_closed(): void
    {
        $this->credit('virgen', 50.00);

        $res = $this->close('virgen');

        $this->assertSame(422, $res->getStatusCode());
        $this->assertSame('pending', $this->row('virgen')->status);
        $this->assertEquals(50.00, $this->row('virgen')->amount);
    }

    public function test_an_already_paid_credit_cannot_be_closed_or_edited(): void
    {
        $this->credit('listo', 100.00, 100.00)->update(['status' => 'paid']);

        $this->assertSame(422, $this->close('listo')->getStatusCode());
        $this->assertSame(422, $this->update('listo', ['amount' => 50])->getStatusCode());
        $this->assertEquals(100.00, $this->row('listo')->amount);
        $this->assertNull($this->row('listo')->original_amount);
    }

    public function test_another_business_credit_is_not_found(): void
    {
        $this->credit('ajeno', 216.00, 133.00, null, self::OTHER);

        $this->assertSame(404, $this->close('ajeno')->getStatusCode());
        $this->assertSame(404, $this->update('ajeno', ['amount' => 140])->getStatusCode());
        $this->assertSame(404, $this->destroyCredit('ajeno')->getStatusCode());
        $this->assertSame('partial', $this->row('ajeno')->status);
        $this->assertEquals(216.00, $this->row('ajeno')->amount);
        $this->assertSame(1, Credit::count());
    }

    // ── corregir el monto ───────────────────────────────────────────────────

    public function test_lowering_the_amount_to_what_was_paid_settles_the_credit(): void
    {
        $this->credit('emi', 216.00, 133.00);

        $res = $this->update('emi', ['amount' => 133]);

        $this->assertSame(200, $res->getStatusCode());
        $c = $this->row('emi');
        $this->assertSame('paid', $c->status);
        $this->assertEquals(133.00, $c->amount);
        $this->assertSame('adjusted', $c->paid_method);
        $this->assertEquals(216.00, $c->original_amount);
    }

    public function test_lowering_the_amount_but_not_to_what_was_paid_keeps_the_balance_open(): void
    {
        $this->credit('emi', 216.00, 133.00);

        $this->update('emi', ['amount' => 150]);

        $c = $this->row('emi');
        $this->assertSame('partial', $c->status);
        $this->assertEquals(17.00, $c->remaining);
        $this->assertNull($c->paid_at);
        $this->assertNull($c->paid_method);
    }

    public function test_the_amount_cannot_go_below_what_was_already_paid(): void
    {
        $this->credit('emi', 216.00, 133.00);

        $res = $this->update('emi', ['amount' => 100]);

        $this->assertSame(422, $res->getStatusCode());
        $this->assertEquals(216.00, $this->row('emi')->amount);
        $this->assertNull($this->row('emi')->original_amount);
    }

    public function test_the_amount_can_be_raised_and_stays_open(): void
    {
        $this->credit('subir', 50.00);

        $this->update('subir', ['amount' => 60]);

        $c = $this->row('subir');
        $this->assertSame('pending', $c->status);
        $this->assertEquals(60.00, $c->amount);
        $this->assertEquals(50.00, $c->original_amount);
    }

    public function test_the_original_amount_is_kept_from_the_first_correction_only(): void
    {
        $this->credit('dos', 100.00);

        $this->update('dos', ['amount' => 80]);
        $this->update('dos', ['amount' => 70]);

        $this->assertEquals(100.00, $this->row('dos')->original_amount);
        $this->assertEquals(70.00, $this->row('dos')->amount);
    }

    public function test_sending_the_same_amount_changes_nothing(): void
    {
        $this->credit('igual', 50.00);

        $res = $this->update('igual', ['amount' => 50]);

        $this->assertSame(200, $res->getStatusCode());
        $this->assertNull($this->row('igual')->original_amount);
    }

    public function test_an_invalid_amount_is_rejected(): void
    {
        $this->credit('mal', 50.00);

        foreach ([['amount' => 0], ['amount' => -5], ['amount' => 'abc'], []] as $body) {
            try {
                $this->update('mal', $body);
                $this->fail('Debió rechazar ' . json_encode($body));
            } catch (ValidationException $e) {
                $this->assertArrayHasKey('amount', $e->errors());
            }
        }
        $this->assertEquals(50.00, $this->row('mal')->amount);
    }

    // ── aviso «pagó al vender» ──────────────────────────────────────────────

    public function test_correcting_the_amount_does_not_turn_the_difference_into_paid_at_sale(): void
    {
        // Venta de $216 enteramente a crédito; se corrige a $133.
        $this->credit('emi', 216.00, 133.00);
        $this->assertEquals(0.0, $this->row('emi')->paid_at_sale);

        $this->update('emi', ['amount' => 133]);

        $c = $this->row('emi');
        $this->assertEquals(216.00, $c->sale_total);
        $this->assertEquals(0.0, $c->paid_at_sale);
    }

    public function test_a_mixed_sale_keeps_its_real_paid_at_sale_after_a_correction(): void
    {
        // Venta de $115: $14,01 pagados al vender y $100,99 a crédito, con $30 abonados.
        $this->credit('mixta', 100.99, 30.00, 115.00);
        $this->assertEquals(14.01, $this->row('mixta')->paid_at_sale);

        $this->close('mixta');

        $c = $this->row('mixta');
        $this->assertEquals(115.00, $c->sale_total);
        $this->assertEquals(14.01, $c->paid_at_sale);
    }

    // ── eliminar con abonos ─────────────────────────────────────────────────

    public function test_a_credit_with_payments_and_a_balance_can_now_be_deleted_keeping_the_income(): void
    {
        $this->credit('emi', 216.00, 133.00);

        $res = $this->destroyCredit('emi');

        $this->assertSame(204, $res->getStatusCode());
        $this->assertNull($this->row('emi'));
        // La venta original y los ingresos ya cobrados no se tocan.
        $this->assertSame(1, DB::table('transactions')->count());
    }
}
