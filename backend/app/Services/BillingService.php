<?php

namespace App\Services;

use App\Models\Business;
use App\Models\BusinessBillingPayment;
use App\Models\BusinessBillingPlan;
use App\Models\SuperadminAuditLog;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Cobro del servicio de Luma a cada negocio, configurado por el superadmin.
 *
 * Reglas (fijadas con el dueño del producto):
 * - El aviso lo ve solo el admin del negocio, como banner arriba del panel.
 * - Aparece los días configurados antes del vencimiento (ej. 5, 3 y 1), el día que vence y TODOS
 *   los días mientras esté vencido. Vencido no se puede cerrar; los demás se cierran por el día.
 * - El superadmin marca cada pago: la próxima fecha avanza un ciclo. No bloquea el sistema.
 * - El primer pago (al terminar el mes gratis) puede tener un monto distinto al recurrente.
 */
class BillingService
{
    public function planFor(string $businessId): ?BusinessBillingPlan
    {
        return BusinessBillingPlan::where('business_id', $businessId)->first();
    }

    /** Monto del próximo pago: el inicial si todavía no se cobró el primero, si no el recurrente. */
    public function amountDue(BusinessBillingPlan $plan): ?float
    {
        if ($plan->next_is_initial && (float) $plan->initial_amount > 0) {
            return (float) $plan->initial_amount;
        }

        return (float) $plan->recurring_amount > 0 ? (float) $plan->recurring_amount : null;
    }

    /** Hoy en la zona horaria del negocio (los vencimientos son por día, no por hora). */
    public function todayFor(Business $business): Carbon
    {
        return Carbon::now($business->timezone ?: 'UTC')->startOfDay();
    }

    /**
     * El aviso que debe ver el negocio hoy, o null si no corresponde mostrar nada.
     *
     * @return array<string, mixed>|null
     */
    public function noticeFor(Business $business, ?BusinessBillingPlan $plan = null, ?Carbon $today = null): ?array
    {
        $plan ??= $this->planFor($business->id);
        if (!$plan || !$plan->enabled || !$plan->next_due_on) {
            return null;
        }

        $amount = $this->amountDue($plan);
        if ($amount === null) {
            return null;
        }

        $today ??= $this->todayFor($business);
        $due = Carbon::parse($plan->next_due_on->format('Y-m-d'), $today->getTimezone())->startOfDay();
        // round: en zonas con horario de verano un "día" puede medir 23 o 25 horas.
        $daysLeft = (int) round($today->diffInDays($due, false));

        $remindDays = $this->remindDays($plan);
        if ($daysLeft > 0 && !in_array($daysLeft, $remindDays, true)) {
            return null;
        }

        $status = $daysLeft < 0 ? 'overdue' : ($daysLeft === 0 ? 'due_today' : 'upcoming');
        $isInitial = $plan->next_is_initial && (float) $plan->initial_amount > 0;

        return [
            'status' => $status,
            'kind' => $isInitial ? 'initial' : 'recurring',
            'in_trial' => $isInitial && $plan->trial_ends_on !== null && $today->lte(
                Carbon::parse($plan->trial_ends_on->format('Y-m-d'), $today->getTimezone())
            ),
            'amount' => round($amount, 2),
            'currency' => $plan->currency ?: 'USD',
            'due_on' => $due->format('Y-m-d'),
            'days_left' => max($daysLeft, 0),
            'days_overdue' => max(-$daysLeft, 0),
            'cycle' => $plan->cycle,
            'payment_instructions' => $plan->payment_instructions,
            'custom_message' => $plan->custom_message,
            'dismissible' => $status !== 'overdue',
        ];
    }

    /** @return int[] días antes del vencimiento en que se avisa, de mayor a menor y sin repetidos */
    public function remindDays(BusinessBillingPlan $plan): array
    {
        $days = is_array($plan->remind_days_before) && $plan->remind_days_before !== []
            ? $plan->remind_days_before
            : BusinessBillingPlan::DEFAULT_REMIND_DAYS;

        $days = array_values(array_unique(array_filter(array_map('intval', $days), fn ($d) => $d > 0)));
        rsort($days);

        return $days;
    }

    /** @param array<string, mixed> $data campos ya validados por el controller */
    public function savePlan(string $businessId, array $data, string $actorId): BusinessBillingPlan
    {
        $plan = $this->planFor($businessId) ?? new BusinessBillingPlan([
            'id' => Str::uuid()->toString(),
            'business_id' => $businessId,
        ]);

        $plan->fill($data);

        if (array_key_exists('remind_days_before', $data)) {
            $plan->remind_days_before = $this->remindDays($plan);
        }
        // Activar el mes gratis sin fecha de pago explícita: el primer pago vence al terminar.
        if (!$plan->next_due_on && $plan->trial_ends_on) {
            $plan->next_due_on = $plan->trial_ends_on;
        }

        $plan->save();

        $this->audit($actorId, 'billing_plan_updated', $businessId, [
            'enabled' => $plan->enabled,
            'cycle' => $plan->cycle,
            'next_due_on' => $plan->next_due_on?->format('Y-m-d'),
            'amount_due' => $this->amountDue($plan),
        ]);

        return $plan->refresh();
    }

    /**
     * Marca como pagado el vencimiento actual y mueve la próxima fecha un ciclo adelante.
     *
     * @param array{amount?: float|null, paid_on?: string|null, notes?: string|null} $data
     */
    public function recordPayment(Business $business, array $data, string $actorId): BusinessBillingPayment
    {
        return DB::transaction(function () use ($business, $data, $actorId) {
            $plan = BusinessBillingPlan::where('business_id', $business->id)->lockForUpdate()->first();
            if (!$plan || !$plan->next_due_on) {
                throw new RuntimeException('Este negocio no tiene un pago pendiente configurado.');
            }

            $amount = isset($data['amount']) && $data['amount'] !== null
                ? (float) $data['amount']
                : $this->amountDue($plan);
            if (!$amount || $amount <= 0) {
                throw new RuntimeException('Indica el monto pagado.');
            }

            $covered = $plan->next_due_on->format('Y-m-d');
            $isInitial = $plan->next_is_initial && (float) $plan->initial_amount > 0;

            $payment = BusinessBillingPayment::create([
                'id' => Str::uuid()->toString(),
                'business_id' => $business->id,
                'amount' => round($amount, 2),
                'currency' => $plan->currency ?: 'USD',
                'paid_on' => $data['paid_on'] ?? $this->todayFor($business)->format('Y-m-d'),
                'covered_due_on' => $covered,
                'kind' => $isInitial ? 'initial' : 'recurring',
                'notes' => $data['notes'] ?? null,
                'recorded_by' => $actorId,
            ]);

            $plan->next_due_on = $this->advance(Carbon::parse($covered), $plan->cycle)?->format('Y-m-d');
            $plan->next_is_initial = false;
            $plan->save();

            $this->audit($actorId, 'billing_payment_recorded', $business->id, [
                'amount' => $payment->amount,
                'currency' => $payment->currency,
                'covered_due_on' => $covered,
                'next_due_on' => $plan->next_due_on?->format('Y-m-d'),
            ]);

            return $payment;
        });
    }

    /**
     * Deshace el ÚLTIMO pago registrado (para corregir un error al marcarlo): lo borra y devuelve
     * la próxima fecha a la que ese pago había cubierto. Solo el último, para que el historial y
     * la fecha nunca queden desfasados.
     */
    public function undoLastPayment(string $businessId, string $paymentId, string $actorId): void
    {
        DB::transaction(function () use ($businessId, $paymentId, $actorId) {
            $plan = BusinessBillingPlan::where('business_id', $businessId)->lockForUpdate()->first();
            $last = $this->latestPayments($businessId)->first();

            if (!$plan || !$last || $last->id !== $paymentId) {
                throw new RuntimeException('Solo se puede deshacer el último pago registrado.');
            }

            $plan->next_due_on = $last->covered_due_on->format('Y-m-d');
            $plan->next_is_initial = $last->kind === 'initial';
            $plan->save();
            $last->delete();

            $this->audit($actorId, 'billing_payment_undone', $businessId, [
                'amount' => $last->amount,
                'covered_due_on' => $last->covered_due_on->format('Y-m-d'),
            ]);
        });
    }

    /**
     * Pagos del más reciente al más viejo. Primero por la fecha que cubren (cada pago avanza la
     * fecha, así que es el orden real aunque dos se marquen en el mismo segundo) y luego por alta.
     */
    public function latestPayments(string $businessId): Builder
    {
        return BusinessBillingPayment::where('business_id', $businessId)
            ->orderByDesc('covered_due_on')
            ->orderByDesc('created_at');
    }

    public function advance(Carbon $due, string $cycle): ?Carbon
    {
        $months = BusinessBillingPlan::CYCLE_MONTHS[$cycle] ?? null;

        return $months ? $due->copy()->addMonthsNoOverflow($months) : null;
    }

    /** @param array<string, mixed> $metadata */
    private function audit(string $actorId, string $action, string $businessId, array $metadata): void
    {
        SuperadminAuditLog::create([
            'id' => Str::uuid()->toString(),
            'actor_id' => $actorId,
            'action' => $action,
            'business_id' => $businessId,
            'target_profile_id' => null,
            'metadata' => $metadata,
        ]);
    }
}
