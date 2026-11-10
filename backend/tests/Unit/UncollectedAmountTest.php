<?php

namespace Tests\Unit;

use App\Support\UncollectedAmount;
use PHPUnit\Framework\TestCase;

/**
 * La parte de un pago mixto que no entró como dinero (crédito + cortesía). La versión SQL (`sql()`, PostgreSQL/jsonb)
 * se valida contra Postgres: aquí, la regla en PHP y la forma de la expresión.
 */
class UncollectedAmountTest extends TestCase
{
    private function split(string $method, float $amount, array $extra = []): array
    {
        return array_merge(['method' => $method, 'currency' => 'USD', 'inputAmount' => $amount, 'amount' => $amount], $extra);
    }

    public function test_a_mixed_payment_with_credit_and_courtesy_has_both_uncollected(): void
    {
        // Venta de $53: la clienta paga $17; $19 quedan a crédito y $17 son cortesía.
        $breakdown = [$this->split('cash', 17), $this->split('credito', 19), $this->split('cortesia', 17)];

        $this->assertSame(36.0, UncollectedAmount::of('mixed', $breakdown));
    }

    public function test_only_the_credit_or_only_the_courtesy_counts_on_its_own(): void
    {
        $this->assertSame(19.0, UncollectedAmount::of('mixed', [$this->split('cash', 17), $this->split('credito', 19)]));
        $this->assertSame(36.0, UncollectedAmount::of('mixed', [$this->split('cash', 17), $this->split('cortesia', 36)]));
    }

    public function test_money_methods_never_count_as_uncollected(): void
    {
        $breakdown = [$this->split('cash', 10), $this->split('zelle', 10), $this->split('pago_movil', 10), $this->split('gift_card', 5)];

        $this->assertSame(0.0, UncollectedAmount::of('mixed', $breakdown));
    }

    public function test_a_whole_sale_on_credit_or_courtesy_is_not_discounted_twice(): void
    {
        // La venta 100 % a crédito o 100 % cortesía ya se excluye entera de los ingresos.
        $this->assertSame(0.0, UncollectedAmount::of('credito', [$this->split('credito', 50)]));
        $this->assertSame(0.0, UncollectedAmount::of('cortesia', [$this->split('cortesia', 50)]));
    }

    public function test_a_discount_line_is_uncollected_on_any_payment_method(): void
    {
        // Servicio de $53 con 5 % de descuento pagado en efectivo: entran $50,35 y $2,65 no se cobran.
        $cash = [$this->split('cash', 50.35), $this->split('descuento', 2.65, ['percentage' => 5])];
        $this->assertSame(2.65, UncollectedAmount::of('cash', $cash));
        $this->assertSame(2.65, UncollectedAmount::of('mixed', $cash));
        $this->assertSame(2.65, UncollectedAmount::of('zelle', [$this->split('zelle', 50.35), $this->split('descuento', 2.65)]));
    }

    public function test_the_discount_adds_up_with_credit_and_courtesy_in_a_mixed_payment(): void
    {
        // $53 con 5 %: $2,65 de descuento; del resto ($50,35) paga $10 en efectivo, $20,35 a crédito y $20 cortesía.
        $breakdown = [$this->split('cash', 10), $this->split('credito', 20.35), $this->split('cortesia', 20), $this->split('descuento', 2.65)];

        $this->assertSame(43.0, UncollectedAmount::of('mixed', $breakdown));
    }

    public function test_it_tolerates_missing_or_odd_breakdowns(): void
    {
        $this->assertSame(0.0, UncollectedAmount::of('mixed', null));
        $this->assertSame(0.0, UncollectedAmount::of('mixed', []));
        // Un cobro sin método (dato viejo) se lee por su desglose, como cualquier otro que no sea venta entera a crédito o cortesía.
        $this->assertSame(5.0, UncollectedAmount::of(null, [$this->split('credito', 5)]));
        $this->assertSame(0.0, UncollectedAmount::of('mixed', ['basura', 5, null]));
    }

    public function test_it_falls_back_to_input_amount_like_the_credit_portion_does(): void
    {
        $this->assertSame(10.0, UncollectedAmount::of('mixed', [['method' => 'credito', 'inputAmount' => 10]]));
        $this->assertSame(7.5, UncollectedAmount::of('mixed', [['method' => 'cortesia', 'input_amount' => 7.5]]));
        $this->assertSame(10.0, UncollectedAmount::of('mixed', [['method' => 'credito', 'amount' => 10, 'inputAmount' => 4000, 'currency' => 'VES']]));
    }

    public function test_the_amount_is_rounded_to_cents(): void
    {
        $this->assertSame(0.3, UncollectedAmount::of('mixed', [$this->split('credito', 0.1), $this->split('cortesia', 0.2)]));
    }

    public function test_the_sql_expression_targets_the_given_table_and_only_those_methods(): void
    {
        $sql = UncollectedAmount::sql('t');

        $this->assertStringContainsString("t.method NOT IN ('credito','cortesia')", $sql);
        $this->assertStringContainsString("jsonb_typeof(t.payments_breakdown) = 'array'", $sql);
        $this->assertStringContainsString("IN ('credito','cortesia','descuento')", $sql);
        $this->assertStringContainsString('jsonb_array_elements(t.payments_breakdown)', $sql);
        $this->assertStringContainsString('transactions.method', UncollectedAmount::sql());
    }
}
