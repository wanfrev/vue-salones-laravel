<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\CreditController;
use App\Models\Credit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Un crédito guarda solo la parte que quedó a crédito (`amount`); lo pagado en el momento de la venta
 * (p. ej. $14,01 con gift card en una venta de $115,00 con $100,99 a crédito) tiene que verse en Créditos
 * sin tocar `amount` ni `paid_amount`. SQLite en memoria.
 */
class CreditSaleTotalTest extends TestCase
{
    private const BIZ = '11111111-1111-4111-8111-111111111111';

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
            $t->decimal('paid_amount', 12, 2)->default(0);
            $t->string('currency')->default('USD');
            $t->string('status')->default('pending');
            $t->dateTime('paid_at')->nullable();
            $t->string('paid_method')->nullable();
            $t->string('created_by')->nullable();
            $t->timestamps();
        });
    }

    private function credit(string $id, float $saleTotal, float $creditAmount, string $method = 'mixed', float $paid = 0.0): Credit
    {
        DB::table('transactions')->insert(['id' => "tx-$id", 'business_id' => self::BIZ, 'total_amount' => $saleTotal, 'method' => $method]);

        return Credit::create([
            'id' => $id, 'business_id' => self::BIZ, 'client_name' => 'PAULA GALLEGOS', 'transaction_id' => "tx-$id",
            'amount' => $creditAmount, 'paid_amount' => $paid, 'currency' => 'USD', 'status' => $paid > 0 ? 'partial' : 'pending',
        ]);
    }

    private function listed(): array
    {
        $request = Request::create('/credits', 'GET', ['business_id' => self::BIZ]);

        return collect(json_decode((new CreditController())->index($request)->getContent(), true))->keyBy('id')->all();
    }

    public function test_a_mixed_sale_shows_the_whole_sale_and_what_was_paid_at_that_moment(): void
    {
        $this->credit('paula', 115.00, 100.99);

        $row = $this->listed()['paula'];

        $this->assertEquals(115.00, $row['sale_total']);
        $this->assertEquals(14.01, $row['paid_at_sale']);
        // Lo que ya había: el crédito sigue siendo solo la parte pendiente y sin abonos propios.
        $this->assertEquals(100.99, $row['amount']);
        $this->assertEquals(0.0, $row['paid_amount']);
        $this->assertEquals(100.99, $row['remaining']);
    }

    public function test_a_sale_fully_on_credit_has_nothing_paid_at_sale(): void
    {
        $this->credit('todo', 50.00, 50.00, 'credito');

        $row = $this->listed()['todo'];

        $this->assertEquals(50.00, $row['sale_total']);
        $this->assertEquals(0.0, $row['paid_amount']);
        $this->assertEquals(0.0, $row['paid_at_sale']);
    }

    public function test_later_abonos_do_not_change_what_was_paid_at_sale(): void
    {
        $this->credit('abonado', 115.00, 100.99, 'mixed', 30.00);

        $row = $this->listed()['abonado'];

        $this->assertEquals(14.01, $row['paid_at_sale']);
        $this->assertEquals(30.00, $row['paid_amount']);
        $this->assertEquals(70.99, $row['remaining']);
    }

    public function test_a_transaction_total_below_the_credit_never_gives_a_negative_payment(): void
    {
        // La transacción se editó después y quedó por debajo de lo que se registró a crédito.
        $this->credit('editada', 90.00, 100.99);

        $row = $this->listed()['editada'];

        $this->assertEquals(100.99, $row['sale_total']);
        $this->assertEquals(0.0, $row['paid_at_sale']);
    }

    public function test_without_the_transaction_loaded_the_fields_are_null_and_no_query_is_run(): void
    {
        $credit = $this->credit('sin', 115.00, 100.99);

        $fresh = Credit::find($credit->id);
        $queries = 0;
        DB::listen(function () use (&$queries) {
            $queries++;
        });

        $array = $fresh->toArray();

        $this->assertNull($array['sale_total']);
        $this->assertNull($array['paid_at_sale']);
        $this->assertSame(0, $queries, 'Serializar un crédito sin la transacción cargada no debe consultar la base (N+1).');
    }
}
