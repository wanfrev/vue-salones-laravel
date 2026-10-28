<?php

namespace Tests\Feature;

use App\Console\Commands\GenerateReminders;
use App\Models\Appointment;
use App\Models\Business;
use App\Models\MessageTemplate;
use App\Services\NotificationService;
use App\Services\WhatsAppService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Mockery;
use ReflectionMethod;
use Tests\TestCase;

/**
 * El seguimiento por WhatsApp (`follow_up`) cuenta desde la última visita del cliente: si ya volvió
 * después de la cita que cae en la ventana, no se le escribe. SQLite en memoria con las tablas
 * mínimas y el envío de WhatsApp simulado.
 */
class FollowUpWhatsAppTest extends TestCase
{
    private const BIZ = 'biz-1';

    /** @var array<int, string> ids de cita a los que se les "envió" el mensaje */
    private array $sentTo = [];

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-10-24 15:00:00');

        Schema::dropAllTables();
        Schema::create('businesses', function ($t) {
            $t->string('id')->primary();
            $t->boolean('active')->default(true);
        });
        Schema::create('clients', function ($t) {
            $t->string('id')->primary();
            $t->string('full_name')->nullable();
            $t->string('phone')->nullable();
        });
        Schema::create('services', function ($t) {
            $t->string('id')->primary();
            $t->string('name')->nullable();
        });
        Schema::create('appointments', function ($t) {
            $t->string('id')->primary();
            $t->string('business_id');
            $t->string('branch_id')->nullable();
            $t->string('client_id')->nullable();
            $t->string('service_id')->nullable();
            $t->string('group_id')->nullable();
            $t->dateTime('start_time');
            $t->dateTime('end_time');
            $t->string('status')->default('completed');
            $t->text('reminders_sent')->nullable();
            $t->timestamps();
        });

        DB::table('businesses')->insert(['id' => self::BIZ, 'active' => true]);
        DB::table('services')->insert(['id' => 's1', 'name' => 'Manicure']);
        DB::table('clients')->insert([
            ['id' => 'c-vino-ayer', 'full_name' => 'Vino Ayer', 'phone' => '0414111'],
            ['id' => 'c-no-volvio', 'full_name' => 'No Volvio', 'phone' => '0414222'],
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function appt(string $id, string $client, string $start, string $end, string $status = 'completed', ?string $group = null): void
    {
        DB::table('appointments')->insert([
            'id' => $id, 'business_id' => self::BIZ, 'client_id' => $client, 'service_id' => 's1',
            'group_id' => $group, 'start_time' => $start, 'end_time' => $end, 'status' => $status,
        ]);
    }

    /** Resultado que devuelve el envío simulado (OUTCOME_SENT / OUTCOME_RETRY / OUTCOME_FAILED). */
    private string $outcome = WhatsAppService::OUTCOME_SENT;

    private function run432(float $offsetHours = 432, string $type = 'follow_up'): void
    {
        $whatsapp = Mockery::mock(WhatsAppService::class);
        $whatsapp->shouldReceive('sendReminderOutcome')->andReturnUsing(function (Appointment $appt) {
            $this->sentTo[] = $appt->id;

            return $this->outcome;
        });

        $command = new GenerateReminders(Mockery::mock(NotificationService::class), $whatsapp);
        $template = new MessageTemplate(['type' => $type, 'offset_hours' => $offsetHours, 'body' => 'Hola']);
        $template->id = 'tpl-1';

        $method = new ReflectionMethod($command, 'sendWhatsAppForTemplate');
        $business = Business::find(self::BIZ);
        $ids = [];
        $sent = 0;
        $method->invokeArgs($command, [$business, $template, now(), &$ids, &$sent]);
    }

    public function test_follow_up_skips_the_client_who_already_came_back(): void
    {
        // 432 h = 18 días antes de "ahora" (24 oct 15:00) → 6 oct 15:00.
        $this->appt('viejo-vino-ayer', 'c-vino-ayer', '2026-10-06 13:00:00', '2026-10-06 15:00:00');
        $this->appt('reciente', 'c-vino-ayer', '2026-10-23 13:00:00', '2026-10-23 14:00:00');
        $this->appt('viejo-no-volvio', 'c-no-volvio', '2026-10-06 13:00:00', '2026-10-06 15:00:00');

        $this->run432();

        $this->assertSame(['viejo-no-volvio'], $this->sentTo);
    }

    public function test_follow_up_ignores_cancelled_and_no_show_returns(): void
    {
        $this->appt('viejo', 'c-vino-ayer', '2026-10-06 13:00:00', '2026-10-06 15:00:00');
        $this->appt('cancelada', 'c-vino-ayer', '2026-10-20 13:00:00', '2026-10-20 14:00:00', 'cancelled');
        $this->appt('falto', 'c-vino-ayer', '2026-10-22 13:00:00', '2026-10-22 14:00:00', 'no_show');

        $this->run432();

        $this->assertSame(['viejo'], $this->sentTo);
    }

    public function test_follow_up_is_not_sent_to_a_client_who_already_has_a_future_booking(): void
    {
        // «Ya tengo cita programada para el sábado»: preguntarle si quiere agendar es un error.
        $this->appt('viejo', 'c-vino-ayer', '2026-10-06 13:00:00', '2026-10-06 15:00:00');
        $this->appt('futura', 'c-vino-ayer', '2026-10-30 13:00:00', '2026-10-30 14:00:00', 'confirmed');
        $this->appt('viejo-otra', 'c-no-volvio', '2026-10-06 13:00:00', '2026-10-06 15:00:00');
        $this->appt('futura-cancelada', 'c-no-volvio', '2026-10-30 13:00:00', '2026-10-30 14:00:00', 'cancelled');

        $this->run432();

        $this->assertSame(['viejo-otra'], $this->sentTo, 'una cita futura cancelada no cuenta como agendada');
    }

    public function test_a_visit_with_services_ending_far_apart_gets_exactly_one_follow_up(): void
    {
        // Mismo grupo; el primer servicio termina dentro de la ventana de ±60 min y el último
        // 2 h y media más tarde. Antes: un mensaje cuando entraba cada servicio (el reportado).
        $this->appt('a', 'c-no-volvio', '2026-10-06 13:30:00', '2026-10-06 14:30:00', 'completed', 'visita');
        $this->appt('b', 'c-no-volvio', '2026-10-06 15:45:00', '2026-10-06 16:45:00', 'completed', 'visita');

        $this->run432();
        $this->assertSame([], $this->sentTo, 'la visita termina a las 16:45: todavía no le toca');

        Carbon::setTestNow('2026-10-24 15:50:00');
        $this->run432();
        $this->assertSame(['a'], $this->sentTo, 'ya le toca: un solo mensaje por la visita completa');

        foreach (['2026-10-24 16:00:00', '2026-10-24 16:30:00', '2026-10-24 16:55:00'] as $moment) {
            Carbon::setTestNow($moment);
            $this->run432();
        }
        $this->assertSame(['a'], $this->sentTo, 'ninguna otra cita de la visita vuelve a disparar el mensaje');
    }

    public function test_services_booked_separately_the_same_day_are_one_visit(): void
    {
        $this->appt('a', 'c-no-volvio', '2026-10-06 13:30:00', '2026-10-06 14:30:00');
        $this->appt('b', 'c-no-volvio', '2026-10-06 14:30:00', '2026-10-06 15:15:00');
        $this->appt('c', 'c-no-volvio', '2026-10-06 15:15:00', '2026-10-06 15:30:00');

        $this->run432();
        Carbon::setTestNow('2026-10-24 15:20:00');
        $this->run432();

        $this->assertCount(1, $this->sentTo, 'sin group_id, las citas de la misma clienta del mismo día son una visita');
    }

    public function test_a_reminder_two_hours_before_is_one_message_per_visit(): void
    {
        // Servicios consecutivos de la misma visita: 17:00 y 17:45. La ventana de «2 h antes» es de
        // ±12 min, así que el segundo entraba solo 45 min después y recibía su propio mensaje.
        $this->appt('a', 'c-no-volvio', '2026-10-24 17:00:00', '2026-10-24 17:45:00', 'confirmed', 'visita');
        $this->appt('b', 'c-no-volvio', '2026-10-24 17:45:00', '2026-10-24 18:15:00', 'confirmed', 'visita');

        $this->run432(2, 'appointment_reminder');
        $this->assertSame(['a'], $this->sentTo);

        Carbon::setTestNow('2026-10-24 15:45:00');
        $this->run432(2, 'appointment_reminder');
        $this->assertSame(['a'], $this->sentTo, 'el segundo servicio no recibe otro recordatorio');
    }

    public function test_a_second_run_at_the_same_time_cannot_send_again(): void
    {
        $this->appt('viejo', 'c-no-volvio', '2026-10-06 13:00:00', '2026-10-06 15:00:00');

        \Illuminate\Support\Facades\Cache::lock('reminders:generate', 60)->get();
        $this->artisan('reminders:generate')->expectsOutputToContain('Ya hay una corrida en curso')->assertSuccessful();

        $this->assertSame([], $this->sentTo);
    }

    public function test_other_services_of_the_same_visit_do_not_count_as_a_return(): void
    {
        $this->appt('a', 'c-no-volvio', '2026-10-06 13:00:00', '2026-10-06 14:00:00', 'completed', 'visita-1');
        $this->appt('b', 'c-no-volvio', '2026-10-06 14:00:00', '2026-10-06 15:00:00', 'completed', 'visita-1');

        $this->run432();

        $this->assertCount(1, $this->sentTo, 'una visita con varios servicios manda un solo mensaje');
    }

    public function test_a_disconnected_number_is_retried_on_the_next_run(): void
    {
        $this->appt('viejo', 'c-no-volvio', '2026-10-06 13:00:00', '2026-10-06 15:00:00');

        $this->outcome = WhatsAppService::OUTCOME_RETRY;
        $this->run432();
        $this->assertSame(['viejo'], $this->sentTo, 'primer intento: el número no estaba conectado');

        $this->outcome = WhatsAppService::OUTCOME_SENT;
        $this->run432();
        $this->assertSame(['viejo', 'viejo'], $this->sentTo, 'segundo intento: sigue pendiente y sale');

        $this->run432();
        $this->assertSame(['viejo', 'viejo'], $this->sentTo, 'ya enviado: no se repite');
    }

    public function test_a_permanent_failure_is_not_retried(): void
    {
        $this->appt('viejo', 'c-no-volvio', '2026-10-06 13:00:00', '2026-10-06 15:00:00');

        $this->outcome = WhatsAppService::OUTCOME_FAILED;
        $this->run432();
        $this->run432();

        $this->assertSame(['viejo'], $this->sentTo);
    }

    public function test_follow_up_window_is_not_stretched_to_43_hours(): void
    {
        // Una cita que terminó hace 16,5 días (≈ 400 h) no debe recibir el seguimiento de 432 h.
        $this->appt('antes-de-tiempo', 'c-no-volvio', '2026-10-07 13:00:00', '2026-10-07 14:00:00');

        $this->run432();

        $this->assertSame([], $this->sentTo);
    }
}
