<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\BusinessBillingPayment;
use App\Models\BusinessBillingPlan;
use App\Services\BillingService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Tests\TestCase;

/**
 * Cobro del servicio por negocio: cuándo aparece el aviso, cuánto dice y cómo avanza la fecha al
 * marcar/deshacer pagos. SQLite en memoria con solo las tablas necesarias (FK apagadas).
 */
class BillingServiceTest extends TestCase
{
    private const BIZ = 'biz-1';
    private const ACTOR = 'super-1';

    private BillingService $svc;
    private Business $business;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::disableForeignKeyConstraints();
        Schema::create('businesses', function ($t) {
            $t->uuid('id')->primary();
            $t->string('name')->nullable();
            $t->string('timezone')->nullable();
            $t->timestamps();
        });
        Schema::create('superadmin_audit_logs', function ($t) {
            $t->uuid('id')->primary();
            $t->uuid('actor_id');
            $t->string('action', 100);
            $t->uuid('business_id')->nullable();
            $t->uuid('target_profile_id')->nullable();
            $t->json('metadata')->nullable();
            $t->timestamp('created_at')->useCurrent();
        });
        (require database_path('migrations/2026_10_21_000000_create_business_billing_tables.php'))->up();

        DB::table('businesses')->insert(['id' => self::BIZ, 'name' => 'Salón', 'timezone' => 'America/Caracas']);
        $this->business = Business::findOrFail(self::BIZ);
        $this->svc = new BillingService();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function plan(array $override = []): BusinessBillingPlan
    {
        return $this->svc->savePlan(self::BIZ, array_merge([
            'enabled' => true,
            'currency' => 'USD',
            'trial_ends_on' => '2026-11-20',
            'initial_amount' => 50,
            'cycle' => 'monthly',
            'recurring_amount' => 30,
            'next_due_on' => null,
            'next_is_initial' => true,
            'remind_days_before' => [5, 3],
            'payment_instructions' => 'Pago móvil 0102',
            'custom_message' => null,
        ], $override), self::ACTOR);
    }

    private function noticeOn(string $date): ?array
    {
        return $this->svc->noticeFor($this->business, $this->svc->planFor(self::BIZ), Carbon::parse($date, 'America/Caracas'));
    }

    public function test_trial_without_due_date_uses_trial_end_as_first_due_date(): void
    {
        $plan = $this->plan();

        $this->assertSame('2026-11-20', $plan->next_due_on->format('Y-m-d'));
        $this->assertSame(50.0, $this->svc->amountDue($plan));
        $this->assertDatabaseHas('superadmin_audit_logs', ['action' => 'billing_plan_updated', 'business_id' => self::BIZ]);
    }

    public function test_notice_only_on_configured_days_due_day_and_every_overdue_day(): void
    {
        $this->plan();

        $this->assertNull($this->noticeOn('2026-11-14'));   // 6 días antes: no está configurado
        $five = $this->noticeOn('2026-11-15');
        $this->assertSame('upcoming', $five['status']);
        $this->assertSame(5, $five['days_left']);
        $this->assertSame('initial', $five['kind']);
        $this->assertTrue($five['in_trial']);
        $this->assertSame(50.0, $five['amount']);
        $this->assertTrue($five['dismissible']);

        $this->assertNull($this->noticeOn('2026-11-16'));   // 4 días antes
        $this->assertSame(3, $this->noticeOn('2026-11-17')['days_left']);
        $this->assertNull($this->noticeOn('2026-11-19'));   // 1 día: no configurado aquí

        $this->assertSame('due_today', $this->noticeOn('2026-11-20')['status']);

        $late = $this->noticeOn('2026-11-27');
        $this->assertSame('overdue', $late['status']);
        $this->assertSame(7, $late['days_overdue']);
        $this->assertFalse($late['dismissible']);
    }

    public function test_disabled_plan_or_missing_amount_shows_nothing(): void
    {
        $this->plan(['enabled' => false]);
        $this->assertNull($this->noticeOn('2026-11-20'));

        $this->plan(['enabled' => true, 'initial_amount' => null, 'recurring_amount' => null]);
        $this->assertNull($this->noticeOn('2026-11-20'));
    }

    public function test_without_initial_amount_the_first_payment_uses_the_recurring_amount(): void
    {
        $this->plan(['initial_amount' => 0]);

        $notice = $this->noticeOn('2026-11-20');
        $this->assertSame('recurring', $notice['kind']);
        $this->assertSame(30.0, $notice['amount']);
    }

    public function test_recording_payment_advances_one_cycle_and_switches_to_recurring_amount(): void
    {
        $this->plan();

        $first = $this->svc->recordPayment($this->business, ['paid_on' => '2026-11-21'], self::ACTOR);
        $this->assertSame(50.0, $first->amount);
        $this->assertSame('initial', $first->kind);
        $this->assertSame('2026-11-20', $first->covered_due_on->format('Y-m-d'));

        $plan = $this->svc->planFor(self::BIZ);
        $this->assertSame('2026-12-20', $plan->next_due_on->format('Y-m-d'));
        $this->assertFalse($plan->next_is_initial);
        $this->assertSame(30.0, $this->svc->amountDue($plan));
        $this->assertNull($this->noticeOn('2026-11-27'));   // ya no está vencido

        $this->svc->recordPayment($this->business, ['amount' => 25], self::ACTOR);
        $this->assertSame('2027-01-20', $this->svc->planFor(self::BIZ)->next_due_on->format('Y-m-d'));
        $this->assertSame(25.0, BusinessBillingPayment::where('kind', 'recurring')->first()->amount);
    }

    public function test_cycles_advance_by_their_months_without_overflow(): void
    {
        $due = Carbon::parse('2026-01-31');

        $this->assertSame('2026-02-28', $this->svc->advance($due, 'monthly')->format('Y-m-d'));
        $this->assertSame('2026-04-30', $this->svc->advance($due, 'quarterly')->format('Y-m-d'));
        $this->assertSame('2026-07-31', $this->svc->advance($due, 'semiannual')->format('Y-m-d'));
        $this->assertSame('2027-01-31', $this->svc->advance($due, 'annual')->format('Y-m-d'));
        $this->assertNull($this->svc->advance($due, 'none'));
    }

    public function test_one_time_plan_stops_reminding_after_payment(): void
    {
        $this->plan(['cycle' => 'none']);
        $this->svc->recordPayment($this->business, [], self::ACTOR);

        $this->assertNull($this->svc->planFor(self::BIZ)->next_due_on);
        $this->assertNull($this->noticeOn('2026-12-20'));
        $this->expectException(RuntimeException::class);
        $this->svc->recordPayment($this->business, [], self::ACTOR);
    }

    public function test_only_the_last_payment_can_be_undone_and_it_restores_the_due_date(): void
    {
        $this->plan();
        $first = $this->svc->recordPayment($this->business, [], self::ACTOR);
        $second = $this->svc->recordPayment($this->business, [], self::ACTOR);

        try {
            $this->svc->undoLastPayment(self::BIZ, $first->id, self::ACTOR);
            $this->fail('Deshacer un pago que no es el último debe fallar.');
        } catch (RuntimeException) {
        }

        $this->svc->undoLastPayment(self::BIZ, $second->id, self::ACTOR);
        $plan = $this->svc->planFor(self::BIZ);
        $this->assertSame('2026-12-20', $plan->next_due_on->format('Y-m-d'));
        $this->assertFalse($plan->next_is_initial);

        $this->svc->undoLastPayment(self::BIZ, $first->id, self::ACTOR);
        $plan = $this->svc->planFor(self::BIZ);
        $this->assertSame('2026-11-20', $plan->next_due_on->format('Y-m-d'));
        $this->assertTrue($plan->next_is_initial);
        $this->assertSame(0, BusinessBillingPayment::count());
    }

    public function test_remind_days_are_normalized(): void
    {
        $plan = $this->plan(['remind_days_before' => [1, 7, 3, 7, 0]]);

        $this->assertSame([7, 3, 1], $plan->remind_days_before);
    }
}
