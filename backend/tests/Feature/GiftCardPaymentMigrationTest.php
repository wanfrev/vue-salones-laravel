<?php

namespace Tests\Feature;

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * La migración de `gift_card_payments` se aplica en el servidor real (`php artisan migrate`): aquí se comprueba que sube,
 * que impone una sola fila por gift card y que baja. SQLite en memoria.
 */
class GiftCardPaymentMigrationTest extends TestCase
{
    private function migration(): object
    {
        return require base_path('database/migrations/2026_11_07_000001_create_gift_card_payments_table.php');
    }

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropAllTables();
        Schema::create('businesses', fn ($t) => $t->uuid('id')->primary());
        Schema::create('gift_cards', fn ($t) => $t->uuid('id')->primary());
    }

    public function test_it_creates_the_table_with_the_columns_the_service_uses(): void
    {
        $this->migration()->up();

        $this->assertTrue(Schema::hasTable('gift_card_payments'));
        foreach (['id', 'business_id', 'branch_id', 'gift_card_id', 'amount', 'payments_breakdown', 'exchange_rate', 'paid_at', 'created_by', 'created_at', 'updated_at'] as $column) {
            $this->assertTrue(Schema::hasColumn('gift_card_payments', $column), "falta la columna {$column}");
        }
    }

    public function test_a_gift_card_can_only_have_one_payment(): void
    {
        $this->migration()->up();
        DB::table('businesses')->insert(['id' => 'b1']);
        DB::table('gift_cards')->insert(['id' => 'g1']);
        $row = fn (string $id) => ['id' => $id, 'business_id' => 'b1', 'gift_card_id' => 'g1', 'amount' => 50, 'payments_breakdown' => '[]', 'paid_at' => '2026-11-06 14:00:00'];

        DB::table('gift_card_payments')->insert($row('p1'));

        $this->expectException(QueryException::class);
        DB::table('gift_card_payments')->insert($row('p2'));
    }

    public function test_it_can_be_rolled_back(): void
    {
        $migration = $this->migration();
        $migration->up();
        $migration->down();

        $this->assertFalse(Schema::hasTable('gift_card_payments'));
    }
}
