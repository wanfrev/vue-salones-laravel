<?php

namespace App\Http\Controllers\Api;

use App\Models\Business;
use App\Models\BusinessBillingPayment;
use App\Models\BusinessBillingPlan;
use App\Services\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use RuntimeException;

/** Configuración del cobro del servicio por negocio. Solo superadmin (middleware en routes/api.php). */
class BusinessBillingController
{
    public function __construct(private BillingService $billing) {}

    public function show(string $id): JsonResponse
    {
        $business = Business::find($id);
        if (!$business) {
            return response()->json(['message' => 'Negocio no encontrado.'], 404);
        }

        return response()->json($this->payload($business));
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $business = Business::find($id);
        if (!$business) {
            return response()->json(['message' => 'Negocio no encontrado.'], 404);
        }

        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'currency' => ['required', Rule::in(['USD', 'VES'])],
            'trial_ends_on' => ['nullable', 'date_format:Y-m-d'],
            'initial_amount' => ['nullable', 'numeric', 'min:0', 'max:1000000'],
            'cycle' => ['required', Rule::in(BusinessBillingPlan::CYCLES)],
            'recurring_amount' => ['nullable', 'numeric', 'min:0', 'max:1000000'],
            'next_due_on' => ['nullable', 'date_format:Y-m-d'],
            'next_is_initial' => ['required', 'boolean'],
            'remind_days_before' => ['present', 'array', 'max:10'],
            'remind_days_before.*' => ['integer', 'min:1', 'max:90'],
            'payment_instructions' => ['nullable', 'string', 'max:2000'],
            'custom_message' => ['nullable', 'string', 'max:500'],
        ]);

        $this->billing->savePlan($business->id, $data, $request->user()->id);

        return response()->json($this->payload($business));
    }

    public function storePayment(Request $request, string $id): JsonResponse
    {
        $business = Business::find($id);
        if (!$business) {
            return response()->json(['message' => 'Negocio no encontrado.'], 404);
        }

        $data = $request->validate([
            'amount' => ['nullable', 'numeric', 'min:0.01', 'max:1000000'],
            'paid_on' => ['nullable', 'date_format:Y-m-d'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $this->billing->recordPayment($business, $data, $request->user()->id);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($this->payload($business), 201);
    }

    public function destroyPayment(Request $request, string $id, string $paymentId): JsonResponse
    {
        $business = Business::find($id);
        if (!$business) {
            return response()->json(['message' => 'Negocio no encontrado.'], 404);
        }

        try {
            $this->billing->undoLastPayment($business->id, $paymentId, $request->user()->id);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($this->payload($business));
    }

    /** @return array<string, mixed> plan (o valores por defecto), historial y vista previa del aviso */
    private function payload(Business $business): array
    {
        $plan = $this->billing->planFor($business->id);

        $payments = $this->billing->latestPayments($business->id)
            ->with('recorder:id,name,email')
            ->limit(50)
            ->get()
            ->map(fn (BusinessBillingPayment $p) => [
                'id' => $p->id,
                'amount' => $p->amount,
                'currency' => $p->currency,
                'paid_on' => $p->paid_on?->format('Y-m-d'),
                'covered_due_on' => $p->covered_due_on?->format('Y-m-d'),
                'kind' => $p->kind,
                'notes' => $p->notes,
                'recorded_by' => $p->recorder?->name ?? $p->recorder?->email,
                'created_at' => $p->created_at?->toIso8601String(),
            ]);

        return [
            'plan' => $plan ? [
                'enabled' => $plan->enabled,
                'currency' => $plan->currency,
                'trial_ends_on' => $plan->trial_ends_on?->format('Y-m-d'),
                'initial_amount' => $plan->initial_amount,
                'cycle' => $plan->cycle,
                'recurring_amount' => $plan->recurring_amount,
                'next_due_on' => $plan->next_due_on?->format('Y-m-d'),
                'next_is_initial' => $plan->next_is_initial,
                'remind_days_before' => $this->billing->remindDays($plan),
                'payment_instructions' => $plan->payment_instructions,
                'custom_message' => $plan->custom_message,
            ] : null,
            'amount_due' => $plan ? $this->billing->amountDue($plan) : null,
            'today' => $this->billing->todayFor($business)->format('Y-m-d'),
            // Lo que el negocio vería hoy (null = hoy no le toca aviso).
            'notice_today' => $plan ? $this->billing->noticeFor($business, $plan) : null,
            'payments' => $payments,
        ];
    }
}
