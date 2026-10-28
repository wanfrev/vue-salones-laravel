<?php

namespace App\Jobs;

use App\Models\Appointment;
use App\Services\WhatsAppService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

/**
 * Manda la confirmación de WhatsApp de una cita recién agendada, fuera de la petición que la crea
 * (un servidor de WhatsApp lento ya no deja colgado el guardado de la agenda).
 *
 * Una visita con varios servicios se guarda como varias citas, una petición por servicio; la
 * confirmación sale al crear la primera, así que se despacha con retraso (GROUP_DELAY_SECONDS) y
 * aquí, al ejecutarse, se leen TODAS las citas de la visita para que el mensaje las nombre y las
 * sume. Un solo intento: reintentar podría confirmar dos veces.
 */
class SendAppointmentConfirmationJob implements ShouldQueue
{
    use Dispatchable;
    use Queueable;

    /** Holgura para que el frontend termine de guardar los demás servicios de la visita. */
    public const GROUP_DELAY_SECONDS = 30;

    /** Marca en `reminders_sent` de cada cita de la visita ya confirmada. */
    public const SENT_MARKER = 'wa:confirmation';

    /** Citas de la misma clienta creadas con menos de esto de diferencia son la misma sesión de agendado. */
    private const SESSION_MINUTES = 10;

    public int $tries = 1;

    public function __construct(public string $appointmentId) {}

    public function handle(WhatsAppService $whatsapp): void
    {
        try {
            $appointment = Appointment::with(['client', 'service', 'employeeProfile', 'pet'])->find($this->appointmentId);
            if (!$appointment || in_array($appointment->status, ['cancelled', 'no_show'], true)) {
                return;
            }

            $visit = collect([$appointment]);
            if ($appointment->group_id) {
                $visit = Appointment::with(['service', 'employeeProfile'])
                    ->where('business_id', $appointment->business_id)
                    ->where('group_id', $appointment->group_id)
                    ->whereNotIn('status', ['cancelled', 'no_show'])
                    ->get();
            } elseif ($appointment->client_id && $appointment->created_at) {
                // Servicios agendados por separado en la misma sesión (sin group_id) son una sola
                // visita: sin esto cada uno mandaba su propia confirmación.
                $visit = $visit->concat(
                    Appointment::with(['service', 'employeeProfile'])
                        ->where('business_id', $appointment->business_id)
                        ->where('client_id', $appointment->client_id)
                        ->where('id', '!=', $appointment->id)
                        ->whereBetween('created_at', [$appointment->created_at->copy()->subMinutes(self::SESSION_MINUTES), $appointment->created_at->copy()->addMinutes(self::SESSION_MINUTES)])
                        ->whereNotIn('status', ['cancelled', 'no_show'])
                        ->get()
                );
            }

            // Ya se confirmó esta visita (por otra de sus citas): no se repite.
            if ($visit->contains(fn (Appointment $a) => in_array(self::SENT_MARKER, $a->reminders_sent ?? [], true))) {
                return;
            }

            $whatsapp->sendConfirmation($appointment, $visit);

            // Se marca la visita completa siempre (haya salido o no: este job no reintenta), para que
            // el job de otra de sus citas no vuelva a escribirle.
            foreach ($visit as $appt) {
                $appt->reminders_sent = array_merge($appt->reminders_sent ?? [], [self::SENT_MARKER]);
                $appt->save();
            }
        } catch (\Throwable $e) {
            Log::error("[SendAppointmentConfirmationJob] Error sending WhatsApp confirmation for appointment {$this->appointmentId}: {$e->getMessage()}");
        }
    }
}
