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
            }

            $whatsapp->sendConfirmation($appointment, $visit);
        } catch (\Throwable $e) {
            Log::error("[SendAppointmentConfirmationJob] Error sending WhatsApp confirmation for appointment {$this->appointmentId}: {$e->getMessage()}");
        }
    }
}
