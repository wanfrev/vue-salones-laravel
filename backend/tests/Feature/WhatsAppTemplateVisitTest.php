<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\AppointmentController;
use App\Jobs\SendAppointmentConfirmationJob;
use App\Models\Appointment;
use App\Models\Business;
use App\Services\AppointmentService;
use App\Services\WhatsAppService;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Mockery;
use ReflectionMethod;
use Tests\TestCase;

/**
 * Plantillas de WhatsApp frente a una visita con varios servicios (varias citas con el mismo
 * group_id): el mensaje debe describir la visita completa, la confirmación debe esperar a que se
 * guarden todos los servicios, y los envíos tienen tiempo límite. SQLite en memoria, tablas mínimas.
 */
class WhatsAppTemplateVisitTest extends TestCase
{
    private const BIZ = 'biz-1';

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-10-24 15:00:00');

        Schema::dropAllTables();
        Schema::create('businesses', function ($t) {
            $t->string('id')->primary();
            $t->string('name')->nullable();
            $t->string('timezone')->nullable();
            $t->boolean('active')->default(true);
            $t->boolean('whatsapp_enabled')->default(true);
            $t->text('features')->nullable();
        });
        Schema::create('clients', function ($t) {
            $t->string('id')->primary();
            $t->string('full_name')->nullable();
            $t->string('phone')->nullable();
        });
        Schema::create('pets', function ($t) {
            $t->string('id')->primary();
            $t->string('name')->nullable();
        });
        Schema::create('services', function ($t) {
            $t->string('id')->primary();
            $t->string('name')->nullable();
            $t->decimal('price', 10, 2)->default(0);
        });
        Schema::create('profiles', function ($t) {
            $t->string('id')->primary();
            $t->string('full_name')->nullable();
        });
        Schema::create('appointments', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('branch_id')->nullable();
            $t->string('client_id')->nullable();
            $t->string('pet_id')->nullable();
            $t->string('employee_id')->nullable();
            $t->string('service_id')->nullable();
            $t->string('group_id')->nullable();
            $t->dateTime('start_time');
            $t->dateTime('end_time');
            $t->decimal('price_override', 10, 2)->nullable();
            $t->string('status')->default('confirmed');
            $t->text('reminders_sent')->nullable();
            $t->timestamps();
        });
        Schema::create('branches', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id')->nullable();
            $t->string('name')->nullable();
        });
        Schema::create('whatsapp_instances', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('branch_id')->nullable();
            $t->string('instance_id')->nullable();
            $t->string('instance_status')->nullable();
            $t->string('instance_number')->nullable();
        });
        Schema::create('message_templates', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('type');
            $t->string('name')->nullable();
            $t->text('body');
            $t->boolean('is_active')->default(true);
            $t->decimal('offset_hours', 6, 2)->nullable();
            $t->timestamps();
        });

        DB::table('businesses')->insert([
            'id' => self::BIZ, 'name' => 'Salón Luma', 'timezone' => 'America/Caracas',
            'features' => json_encode(['whatsapp_available' => true]),
        ]);
        DB::table('clients')->insert(['id' => 'c1', 'full_name' => 'María', 'phone' => '0414111']);
        DB::table('services')->insert([
            ['id' => 's-manicure', 'name' => 'Manicure', 'price' => 10],
            ['id' => 's-pedicure', 'name' => 'Pedicure', 'price' => 15],
            ['id' => 's-cejas', 'name' => 'Cejas', 'price' => 5],
        ]);
        DB::table('profiles')->insert([['id' => 'p-ana', 'full_name' => 'Ana'], ['id' => 'p-luis', 'full_name' => 'Luis']]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        Mockery::close();
        parent::tearDown();
    }

    private function appt(string $id, string $service, string $employee, string $startUtc, ?string $group = 'visita-1', ?float $override = null, string $status = 'confirmed'): Appointment
    {
        DB::table('appointments')->insert([
            'id' => $id, 'business_id' => self::BIZ, 'client_id' => 'c1', 'service_id' => $service,
            'employee_id' => $employee, 'group_id' => $group, 'start_time' => $startUtc,
            'end_time' => Carbon::parse($startUtc)->addHour()->toDateTimeString(),
            'price_override' => $override, 'status' => $status,
        ]);

        return Appointment::find($id);
    }

    private function visit(): array
    {
        // Se guardan (y se pasan) fuera de orden: la hora del mensaje debe ser la de la más temprana.
        return [
            $this->appt('b', 's-pedicure', 'p-luis', '2026-10-25 15:00:00'),
            $this->appt('a', 's-manicure', 'p-ana', '2026-10-25 14:00:00', 'visita-1', 12.50),
            $this->appt('c', 's-cejas', 'p-ana', '2026-10-25 16:00:00'),
        ];
    }

    public function test_message_describes_the_whole_visit(): void
    {
        [$b, $a, $c] = $this->visit();

        $text = (new WhatsAppService())->resolveTemplate('{servicio}|{empleado}|{precio}|{fecha} {hora}', $b, [$b, $a, $c]);

        // 14:00 UTC = 10:00 AM en Caracas; precio = 12.50 (override) + 15 + 5.
        $this->assertSame('Manicure, Pedicure, Cejas|Ana, Luis|32.50|25/10/2026 10:00 AM', $text);
    }

    public function test_single_appointment_message_is_unchanged(): void
    {
        $solo = $this->appt('solo', 's-pedicure', 'p-luis', '2026-10-25 15:00:00', null);

        $text = (new WhatsAppService())->resolveTemplate('{servicio}|{empleado}|{precio}|{hora}', $solo);

        $this->assertSame('Pedicure|Luis|15.00|11:00 AM', $text);
    }

    public function test_sucursal_variable_uses_the_branch_name_and_falls_back_to_the_business(): void
    {
        DB::table('branches')->insert(['id' => 'br-centro', 'business_id' => self::BIZ, 'name' => 'Sucursal Centro']);
        $conSucursal = $this->appt('con', 's-cejas', 'p-ana', '2026-10-25 15:00:00', null);
        DB::table('appointments')->where('id', 'con')->update(['branch_id' => 'br-centro']);
        $sinSucursal = $this->appt('sin', 's-cejas', 'p-ana', '2026-10-25 15:00:00', null);

        $whatsapp = new WhatsAppService();

        $this->assertSame('Sucursal Centro', $whatsapp->resolveTemplate('{sucursal}', Appointment::find('con')));
        $this->assertSame('Salón Luma', $whatsapp->resolveTemplate('{sucursal}', $sinSucursal));
        $this->assertSame('Salón Luma · Sucursal Centro', $whatsapp->resolveTemplate('{negocio} · {sucursal}', $conSucursal->fresh()));
    }

    // ── Resultado del envío: reintentar solo si el número no está conectado ────────────────

    private function outcomeFor(string $sendTextResponse, ?string $state, bool $withInstance = true, string $phone = '0414111'): array
    {
        config(['services.evolution.url' => 'http://evo.test', 'services.evolution.api_key' => 'k']);
        DB::table('clients')->where('id', 'c1')->update(['phone' => $phone]);
        if ($withInstance) {
            DB::table('whatsapp_instances')->insert(['id' => 'i1', 'business_id' => self::BIZ, 'branch_id' => null, 'instance_id' => 'biz-1', 'instance_status' => 'open']);
        }
        Http::fake([
            '*/message/sendText/*' => $sendTextResponse === 'ok' ? Http::response(['key' => 1], 201) : Http::response(['error' => 'x'], 500),
            '*/instance/connectionState/*' => Http::response(['instance' => ['state' => $state]]),
        ]);

        $appt = $this->appt('solo', 's-cejas', 'p-ana', '2026-10-25 15:00:00', null);
        $whatsapp = new WhatsAppService();

        return [$whatsapp, $appt, $whatsapp->sendReminderOutcome($appt, 'Hola {cliente}')];
    }

    public function test_outcome_sent(): void
    {
        [, , $outcome] = $this->outcomeFor('ok', 'open');

        $this->assertSame(WhatsAppService::OUTCOME_SENT, $outcome);
    }

    public function test_outcome_retry_when_the_number_is_not_connected_and_it_is_remembered(): void
    {
        [$whatsapp, $appt, $outcome] = $this->outcomeFor('fail', 'close');
        $this->assertSame(WhatsAppService::OUTCOME_RETRY, $outcome);

        // Segundo mensaje de la misma corrida: ni lo intenta ni vuelve a consultar el estado.
        Http::fake();
        $this->assertSame(WhatsAppService::OUTCOME_RETRY, $whatsapp->sendReminderOutcome($appt, 'Hola'));
        Http::assertNothingSent();
    }

    public function test_outcome_failed_when_send_fails_but_the_number_is_connected(): void
    {
        [, , $outcome] = $this->outcomeFor('fail', 'open');

        $this->assertSame(WhatsAppService::OUTCOME_FAILED, $outcome);
    }

    public function test_outcome_retry_when_the_branch_has_no_instance_yet(): void
    {
        [, , $outcome] = $this->outcomeFor('ok', 'open', withInstance: false);

        $this->assertSame(WhatsAppService::OUTCOME_RETRY, $outcome);
    }

    public function test_outcome_failed_when_the_client_has_no_phone(): void
    {
        [, , $outcome] = $this->outcomeFor('ok', 'open', phone: '');

        $this->assertSame(WhatsAppService::OUTCOME_FAILED, $outcome);
    }

    public function test_confirmation_job_sends_once_with_every_service_of_the_visit(): void
    {
        $this->visit();
        $this->appt('d', 's-cejas', 'p-ana', '2026-10-25 17:00:00', 'visita-1', null, 'cancelled');

        $captured = null;
        $whatsapp = Mockery::mock(WhatsAppService::class);
        $whatsapp->shouldReceive('sendConfirmation')->once()->andReturnUsing(function ($appt, $group) use (&$captured) {
            $captured = $group->pluck('id')->sort()->values()->all();

            return true;
        });

        (new SendAppointmentConfirmationJob('a'))->handle($whatsapp);

        $this->assertSame(['a', 'b', 'c'], $captured, 'las tres citas vigentes; la cancelada no cuenta');
    }

    private function runConfirmationJobs(array $ids): int
    {
        $sent = 0;
        $whatsapp = Mockery::mock(WhatsAppService::class);
        $whatsapp->shouldReceive('sendConfirmation')->andReturnUsing(function () use (&$sent) {
            $sent++;

            return true;
        });

        foreach ($ids as $id) {
            (new SendAppointmentConfirmationJob($id))->handle($whatsapp);
        }

        return $sent;
    }

    public function test_a_visit_is_confirmed_once_even_if_every_service_dispatches_its_own_job(): void
    {
        $this->visit();

        $this->assertSame(1, $this->runConfirmationJobs(['a', 'b', 'c']));
    }

    public function test_services_saved_separately_in_one_booking_session_are_confirmed_once(): void
    {
        $this->appt('x', 's-manicure', 'p-ana', '2026-10-25 14:00:00', null);
        $this->appt('y', 's-pedicure', 'p-ana', '2026-10-25 15:00:00', null);
        $this->appt('z', 's-cejas', 'p-ana', '2026-10-25 16:00:00', null);
        DB::table('appointments')->whereIn('id', ['x', 'y', 'z'])->update(['created_at' => '2026-10-24 14:00:00']);
        DB::table('appointments')->where('id', 'y')->update(['created_at' => '2026-10-24 14:00:30']);
        DB::table('appointments')->where('id', 'z')->update(['created_at' => '2026-10-24 14:01:00']);

        $this->assertSame(1, $this->runConfirmationJobs(['x', 'y', 'z']));
    }

    public function test_two_separate_bookings_hours_apart_are_confirmed_separately(): void
    {
        $this->appt('m', 's-manicure', 'p-ana', '2026-10-25 14:00:00', null);
        $this->appt('n', 's-pedicure', 'p-ana', '2026-10-26 14:00:00', null);
        DB::table('appointments')->where('id', 'm')->update(['created_at' => '2026-10-24 09:00:00']);
        DB::table('appointments')->where('id', 'n')->update(['created_at' => '2026-10-24 15:00:00']);

        $this->assertSame(2, $this->runConfirmationJobs(['m', 'n']));
    }

    public function test_confirmation_job_skips_a_cancelled_appointment(): void
    {
        $this->appt('x', 's-cejas', 'p-ana', '2026-10-25 17:00:00', null, null, 'cancelled');
        $whatsapp = Mockery::mock(WhatsAppService::class);
        $whatsapp->shouldReceive('sendConfirmation')->never();

        (new SendAppointmentConfirmationJob('x'))->handle($whatsapp);

        $this->addToAssertionCount(1);
    }

    public function test_confirmation_respects_the_reminders_switch(): void
    {
        DB::table('message_templates')->insert(['id' => 't1', 'business_id' => self::BIZ, 'type' => 'appointment_confirmation', 'body' => 'Hola', 'is_active' => true]);
        DB::table('businesses')->where('id', self::BIZ)->update([
            'features' => json_encode(['whatsapp_available' => true, 'whatsapp_reminders_enabled' => false]),
        ]);
        $appt = $this->appt('solo', 's-cejas', 'p-ana', '2026-10-25 15:00:00', null);

        $whatsapp = Mockery::mock(WhatsAppService::class)->makePartial();
        $whatsapp->shouldReceive('sendReminder')->never();

        $this->assertFalse($whatsapp->sendConfirmation($appt));
    }

    public function test_confirmation_uses_the_oldest_active_template(): void
    {
        DB::table('message_templates')->insert([
            ['id' => 'z-nueva', 'business_id' => self::BIZ, 'type' => 'appointment_confirmation', 'body' => 'NUEVA', 'is_active' => true, 'created_at' => '2026-10-20 10:00:00'],
            ['id' => 'a-vieja', 'business_id' => self::BIZ, 'type' => 'appointment_confirmation', 'body' => 'VIEJA', 'is_active' => true, 'created_at' => '2026-09-01 10:00:00'],
            ['id' => 'inactiva', 'business_id' => self::BIZ, 'type' => 'appointment_confirmation', 'body' => 'INACTIVA', 'is_active' => false, 'created_at' => '2026-01-01 10:00:00'],
        ]);
        $appt = $this->appt('solo', 's-cejas', 'p-ana', '2026-10-25 15:00:00', null);

        $whatsapp = Mockery::mock(WhatsAppService::class)->makePartial();
        $whatsapp->shouldReceive('sendReminder')->once()->with(Mockery::type(Appointment::class), 'VIEJA', null)->andReturn(true);

        $this->assertTrue($whatsapp->sendConfirmation($appt));
    }

    public function test_requests_to_the_whatsapp_server_have_a_time_limit(): void
    {
        $method = new ReflectionMethod(WhatsAppService::class, 'evolution');
        /** @var PendingRequest $request */
        $request = $method->invoke(new WhatsAppService(), 'key');

        $options = (new \ReflectionProperty($request, 'options'))->getValue($request);

        $this->assertSame(10, $options['timeout']);
        $this->assertSame(5, $options['connect_timeout']);
    }

    private function controller(): AppointmentController
    {
        return new AppointmentController(Mockery::mock(AppointmentService::class));
    }

    private function confirm(Appointment $appointment): void
    {
        (new ReflectionMethod(AppointmentController::class, 'sendWhatsAppConfirmation'))->invoke($this->controller(), $appointment);
    }

    public function test_single_booking_confirms_after_the_response(): void
    {
        Bus::fake();

        $this->confirm($this->appt('solo', 's-cejas', 'p-ana', '2026-10-25 15:00:00', null));

        Bus::assertDispatchedAfterResponse(SendAppointmentConfirmationJob::class, fn ($job) => $job->appointmentId === 'solo');
    }

    public function test_first_service_of_a_visit_schedules_a_delayed_confirmation_and_the_rest_do_not(): void
    {
        Bus::fake();

        $first = $this->appt('a', 's-manicure', 'p-ana', '2026-10-25 14:00:00');
        $this->confirm($first);

        Bus::assertDispatched(SendAppointmentConfirmationJob::class, function ($job) {
            return $job->appointmentId === 'a'
                && Carbon::parse($job->delay)->greaterThanOrEqualTo(now()->addSeconds(SendAppointmentConfirmationJob::GROUP_DELAY_SECONDS));
        });
        Bus::assertNotDispatchedAfterResponse(SendAppointmentConfirmationJob::class);

        // Al guardar el segundo servicio ya existe un hermano: no se agenda otra confirmación.
        $second = $this->appt('b', 's-pedicure', 'p-luis', '2026-10-25 15:00:00');
        $this->confirm($second);

        Bus::assertDispatchedTimes(SendAppointmentConfirmationJob::class, 1);
    }
}
