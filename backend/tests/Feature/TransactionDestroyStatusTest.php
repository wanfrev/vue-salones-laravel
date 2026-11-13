<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\TransactionController;
use App\Models\Transaction;
use App\Services\PosService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Al eliminar un cobro, el estado de pago de la cita se recalcula con los cobros que QUEDAN. Antes quedaba «unpaid»
 * siempre, así que al quitar un cobro duplicado (caso Pierina Segovia, 12/11/2026) la cita volvía a aparecer pendiente
 * aunque el cobro bueno seguía ahí. Esquema mínimo en SQLite.
 */
class TransactionDestroyStatusTest extends TestCase
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

        Schema::create('transaction_audit_logs', function ($t) {
            $t->uuid('id')->primary();
            $t->uuid('business_id');
            $t->uuid('transaction_id')->nullable();
            $t->uuid('branch_id')->nullable();
            $t->string('action');
            $t->uuid('performed_by')->nullable();
            $t->text('reason')->nullable();
            $t->text('before_snapshot')->nullable();
            $t->text('after_snapshot')->nullable();
            $t->timestamps();
        });
        Schema::create('inventory_movements', function ($t) {
            $t->uuid('id')->primary();
            $t->uuid('business_id');
            $t->uuid('branch_id')->nullable();
            $t->uuid('location_id')->nullable();
            $t->uuid('product_id')->nullable();
            $t->uuid('variant_id')->nullable();
            $t->string('movement_type')->nullable();
            $t->decimal('quantity', 12, 3)->default(0);
            $t->decimal('unit_cost', 12, 2)->default(0);
            $t->string('reference_type')->nullable();
            $t->string('reference_id')->nullable();
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

    private function appt(float $price): string
    {
        $id = (string) Str::uuid();
        DB::table('appointments')->insert([
            'id' => $id, 'business_id' => self::BIZ, 'client_id' => self::CLIENT, 'employee_id' => self::DOC, 'service_id' => self::SERVICE,
            'start_time' => '2026-11-12 15:00:00', 'end_time' => '2026-11-12 15:50:00', 'status' => 'completed', 'price_override' => $price,
        ]);

        return $id;
    }

    /** Un cobro «a la fuerza» (como los duplicados reales, que se crearon sin guardia): se inserta directo. */
    private function tx(string $appointmentId, float $amount, string $method = 'punto_venta'): string
    {
        $id = (string) Str::uuid();
        DB::table('transactions')->insert([
            'id' => $id, 'business_id' => self::BIZ, 'appointment_id' => $appointmentId, 'total_amount' => $amount, 'local_amount' => $amount * 0.4,
            'employee_amount' => $amount * 0.6, 'method' => $method, 'paid_at' => '2026-11-12 21:14:34', 'created_at' => '2026-11-12 21:14:34',
        ]);

        return $id;
    }

    private function paymentStatusOf(string $appointmentId): ?string
    {
        return DB::table('appointments')->where('id', $appointmentId)->value('payment_status');
    }

    private function destroy(string $transactionId): int
    {
        $request = Request::create("/transactions/{$transactionId}?business_id=".self::BIZ, 'DELETE', ['reason' => 'Cobro duplicado']);

        return app(TransactionController::class)->destroy($request, $transactionId)->getStatusCode();
    }

    // ── Cobro duplicado ─────────────────────────────────────────────────────────

    public function test_removing_a_duplicate_charge_keeps_the_appointment_paid(): void
    {
        $appt = $this->appt(26);
        $original = $this->tx($appt, 26);
        $duplicate = $this->tx($appt, 26);
        DB::table('appointments')->where('id', $appt)->update(['payment_status' => 'paid']);

        $this->assertSame(204, $this->destroy($duplicate));

        $this->assertSame('paid', $this->paymentStatusOf($appt));        // antes quedaba «unpaid» y volvía a salir como pendiente
        $this->assertSame([$original], Transaction::where('appointment_id', $appt)->pluck('id')->all());
    }

    public function test_the_real_case_removing_only_the_repeated_pair_leaves_both_services_paid(): void
    {
        // Secado $26 + Lavado $12, cobrados dos veces: se quitan solo los dos repetidos.
        $secado = $this->appt(26);
        $lavado = $this->appt(12);
        $secadoOriginal = $this->tx($secado, 26);
        $lavadoOriginal = $this->tx($lavado, 12);
        $secadoRepetido = $this->tx($secado, 26);
        $lavadoRepetido = $this->tx($lavado, 12);
        DB::table('appointments')->update(['payment_status' => 'paid']);

        $this->destroy($secadoRepetido);
        $this->destroy($lavadoRepetido);

        $this->assertSame('paid', $this->paymentStatusOf($secado));
        $this->assertSame('paid', $this->paymentStatusOf($lavado));
        $this->assertEqualsCanonicalizing([$secadoOriginal, $lavadoOriginal], Transaction::pluck('id')->all());
        $this->assertEquals(38.0, (float) Transaction::sum('total_amount')); // $38, no $76
    }

    // ── El resto de los casos ───────────────────────────────────────────────────

    public function test_removing_the_only_charge_leaves_the_appointment_unpaid_as_before(): void
    {
        $appt = $this->appt(38);
        $only = $this->tx($appt, 38);
        DB::table('appointments')->where('id', $appt)->update(['payment_status' => 'paid']);

        $this->destroy($only);

        $this->assertSame('unpaid', $this->paymentStatusOf($appt));
        $this->assertSame(0, Transaction::count());
    }

    public function test_removing_part_of_a_split_payment_leaves_it_partial(): void
    {
        $appt = $this->appt(100);
        $first = $this->tx($appt, 60);
        $second = $this->tx($appt, 40);
        DB::table('appointments')->where('id', $appt)->update(['payment_status' => 'paid']);

        $this->destroy($second);

        $this->assertSame('partial', $this->paymentStatusOf($appt));
        $this->assertSame([$first], Transaction::pluck('id')->all());
    }

    public function test_removing_a_credit_payment_keeps_a_credit_sale_charged(): void
    {
        $appt = $this->appt(50);
        $sale = $this->tx($appt, 50, 'credito');
        $abono = $this->tx($appt, 20, 'cash');
        DB::table('appointments')->where('id', $appt)->update(['payment_status' => 'paid']);

        $this->destroy($abono);

        $this->assertSame('paid', $this->paymentStatusOf($appt)); // la venta a crédito sigue contando como cobrada
        $this->assertSame([$sale], Transaction::pluck('id')->all());
    }

    public function test_other_appointments_are_not_touched(): void
    {
        $one = $this->appt(38);
        $two = $this->appt(38);
        $this->tx($one, 38);
        $remove = $this->tx($one, 38);
        $this->tx($two, 38);
        DB::table('appointments')->update(['payment_status' => 'paid']);

        $this->destroy($remove);

        $this->assertSame('paid', $this->paymentStatusOf($one));
        $this->assertSame('paid', $this->paymentStatusOf($two));
    }

    public function test_the_deletion_is_still_recorded_in_the_audit_log_with_its_reason(): void
    {
        $appt = $this->appt(26);
        $this->tx($appt, 26);
        $duplicate = $this->tx($appt, 26);

        $this->destroy($duplicate);

        $log = DB::table('transaction_audit_logs')->where('transaction_id', $duplicate)->first();
        $this->assertSame('deleted', $log->action);
        $this->assertSame('Cobro duplicado', $log->reason);
    }
}
