<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Models\Bank;
use App\Models\Credit;
use App\Models\CreditPayment;
use App\Models\Transaction;
use App\Support\PaymentDate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CreditController
{
    private function resolveBusinessId(Request $request): ?string
    {
        $fromProfile = $request->user()?->profile?->business_id;
        if ($fromProfile) {
            return $fromProfile;
        }
        $raw = $request->query('business_id');
        if ($raw && preg_match('/eq\.(.+)/', $raw, $m)) {
            return $m[1];
        }
        return $raw ?: null;
    }

    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json([]);
        }

        // La transacción de la venta permite mostrar el total real y lo pagado en el momento (ver Credit::getSaleTotalAttribute).
        $query = Credit::where('business_id', $businessId)
            ->with(['client:id,full_name,phone', 'transaction:id,total_amount']);

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('branch_id')) {
            $branchId = $request->query('branch_id');
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        return response()->json($query->orderByDesc('created_at')->get());
    }

    /**
     * Payment history (abonos) for one credit — every partial/full payment recorded against it,
     * each its own transaction, oldest first.
     */
    public function payments(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        $credit = Credit::where('business_id', $businessId)->find($id);
        if (!$credit) {
            return response()->json(['message' => 'Crédito no encontrado.'], 404);
        }

        return response()->json(
            CreditPayment::where('credit_id', $id)->orderBy('created_at')->get()
        );
    }

    /**
     * Record a payment (abono) against a credit — partial or, if it covers the full remaining
     * balance, the final one. Unlike the old markPaid (which overwrote the *original* sale
     * transaction), this always creates a brand new Transaction for the payment received today,
     * so the sale's own date/amount/method stay intact as history and Finanzas sees the money as
     * income on the day it was actually collected (transactions.method != 'credito' is what
     * FinancialSummaryService counts as income — see fetchInstances-adjacent queries there).
     */
    public function pay(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        $credit = Credit::where('business_id', $businessId)->find($id);
        if (!$credit) {
            return response()->json(['message' => 'Crédito no encontrado.'], 404);
        }
        if ($credit->status === 'paid') {
            return response()->json(['message' => 'Este crédito ya fue pagado por completo.'], 422);
        }

        $remaining = round((float) $credit->amount - (float) $credit->paid_amount, 2);

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01', 'max:' . max($remaining, 0.01)],
            'method' => ['required', 'string', 'max:50', 'not_in:credito'],
            'currency' => ['nullable', 'string', 'in:USD,VES'],
            'exchange_rate' => ['nullable', 'numeric', 'min:0'],
            'bank_id' => ['nullable', 'uuid', Rule::exists('banks', 'id')->where('business_id', $businessId)],
            'paid_date' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $denied = PaymentDate::denial($request->user()?->profile?->role, $businessId, $data['paid_date'] ?? null);
        if ($denied) {
            return response()->json(['message' => $denied], 403);
        }

        try {
            $paidAt = PaymentDate::resolve($businessId, $data['paid_date'] ?? null);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $payment = DB::transaction(function () use ($credit, $data, $businessId, $request, $paidAt) {
            $currency = $data['currency'] ?? 'USD';
            $rate = (float) ($data['exchange_rate'] ?? 1);
            $amount = (float) $data['amount'];

            // Mismo criterio que el POS (PaymentBreakdownItem.bank_id/bank_name): el banco vive
            // dentro de payments_breakdown, solo para los métodos que lo tienen, y el nombre se
            // resuelve acá desde la tabla -- no se confía en el que mande el cliente.
            $bankFields = [];
            if (!empty($data['bank_id']) && in_array($data['method'], ['pago_movil', 'transfer', 'punto_venta'], true)) {
                $bank = Bank::where('business_id', $businessId)->find($data['bank_id']);
                if ($bank) {
                    $bankFields = ['bank_id' => $bank->id, 'bank_name' => $bank->name];
                }
            }

            // Hereda la cita de la venta original a crédito (si la hubo) para que este abono se
            // vea en Finanzas como "Cobro cita" con el cliente/servicio reales, no como una
            // "Venta directa" sin contexto — la comisión del empleado ya quedó registrada en la
            // transacción original 'credito' (ver EmployeeCommissionService), por eso esta sigue
            // en 0: es solo el dinero entrando, no un servicio nuevo.
            $originalAppointmentId = $credit->transaction_id
                ? Transaction::where('business_id', $businessId)->where('id', $credit->transaction_id)->value('appointment_id')
                : null;

            $tx = Transaction::create([
                'id' => Str::uuid()->toString(),
                'business_id' => $businessId,
                'branch_id' => $credit->branch_id,
                'appointment_id' => $originalAppointmentId,
                'employee_id' => null,
                'total_amount' => $amount,
                'local_amount' => $amount,
                'employee_amount' => 0,
                'assistant_amount' => 0,
                'local_percentage' => 100,
                'employee_percentage' => 0,
                'assistant_percentage' => 0,
                'method' => $data['method'],
                'exchange_rate_used' => $currency === 'VES' ? $rate : 1,
                'payments_breakdown' => [[
                    'method' => $data['method'],
                    'currency' => $currency,
                    'inputAmount' => $currency === 'VES' ? round($amount * $rate, 2) : $amount,
                    'amount' => $amount,
                    ...$bankFields,
                ]],
                'created_by' => $request->user()?->id,
                'notes' => "Abono a crédito de {$credit->client_name}",
                'paid_at' => $paidAt ?? now(),
            ]);

            // created_at es lo que muestra el historial de abonos del crédito: con otra fecha
            // tiene que verse la fecha real del pago. La Transaction conserva su created_at
            // real (cuándo se registró) como rastro.
            $creditPayment = new CreditPayment([
                'id' => Str::uuid()->toString(),
                'business_id' => $businessId,
                'credit_id' => $credit->id,
                'transaction_id' => $tx->id,
                'amount' => $amount,
                'method' => $data['method'],
                'currency' => $currency,
                'exchange_rate' => $currency === 'VES' ? $rate : null,
                'created_by' => $request->user()?->id,
            ]);
            if ($paidAt) {
                $creditPayment->created_at = $paidAt;
            }
            $creditPayment->save();

            $newPaidAmount = round((float) $credit->paid_amount + $amount, 2);
            $isFullySettled = $newPaidAmount >= (float) $credit->amount - 0.005;

            $credit->update([
                'paid_amount' => $newPaidAmount,
                'status' => $isFullySettled ? 'paid' : 'partial',
                'paid_at' => $isFullySettled ? ($paidAt ?? now()) : $credit->paid_at,
                'paid_method' => $isFullySettled ? $data['method'] : $credit->paid_method,
            ]);

            return $creditPayment;
        });

        EntityChanged::safe($businessId, 'credit', 'updated', $id);

        return response()->json([
            'credit' => $credit->fresh()->load(['client:id,full_name,phone', 'transaction:id,total_amount']),
            'payment' => $payment,
        ]);
    }

    /**
     * Corrige el monto de un crédito que todavía no está pagado (p. ej. se cargó mal al empezar a usar el sistema).
     * No crea ningún ingreso ni toca ninguna Transaction: solo cambia lo que se espera cobrar. No puede quedar por
     * debajo de lo ya abonado; si queda justo en lo abonado, el crédito pasa a pagado.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $credit = $this->openCredit($request, $id, $error);
        if (!$credit) {
            return $error;
        }

        $data = $request->validate(['amount' => ['required', 'numeric', 'min:0.01', 'max:99999999']]);
        $amount = round((float) $data['amount'], 2);

        if ($amount < round((float) $credit->paid_amount, 2) - 0.005) {
            return response()->json([
                'message' => 'El monto no puede ser menor a lo ya abonado ($' . number_format((float) $credit->paid_amount, 2) . ').',
            ], 422);
        }

        $credit = $this->adjustAmount($credit, $amount, 'adjusted');

        return response()->json($credit->load(['client:id,full_name,phone', 'transaction:id,total_amount']));
    }

    /**
     * Cierra un crédito con abonos dando por cobrado lo que falta: el monto pasa a ser lo abonado y el crédito a
     * pagado. No crea ingreso (el saldo que se perdona nunca entró) y el ingreso de los abonos se queda igual. Sin
     * abonos no aplica: un crédito que no se va a cobrar y no tiene nada abonado se elimina.
     */
    public function close(Request $request, string $id): JsonResponse
    {
        $credit = $this->openCredit($request, $id, $error);
        if (!$credit) {
            return $error;
        }

        if ((float) $credit->paid_amount <= 0) {
            return response()->json(['message' => 'Este crédito no tiene abonos: si no se va a cobrar, elimínalo.'], 422);
        }

        $credit = $this->adjustAmount($credit, round((float) $credit->paid_amount, 2), 'closed');

        return response()->json($credit->load(['client:id,full_name,phone', 'transaction:id,total_amount']));
    }

    /** El crédito del negocio si existe y todavía no está pagado; si no, deja la respuesta de error en `$error`. */
    private function openCredit(Request $request, string $id, ?JsonResponse &$error): ?Credit
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            $error = response()->json(['message' => 'No autorizado.'], 403);
            return null;
        }

        $credit = Credit::where('business_id', $businessId)->find($id);
        if (!$credit) {
            $error = response()->json(['message' => 'Crédito no encontrado.'], 404);
            return null;
        }
        if ($credit->status === 'paid') {
            $error = response()->json(['message' => 'Este crédito ya está pagado y no se puede modificar.'], 422);
            return null;
        }

        return $credit;
    }

    private function adjustAmount(Credit $credit, float $amount, string $settledMethod): Credit
    {
        if (abs($amount - (float) $credit->amount) < 0.005) {
            return $credit;
        }

        $paid = round((float) $credit->paid_amount, 2);
        $settled = $amount <= $paid + 0.005;

        DB::transaction(function () use ($credit, $amount, $paid, $settled, $settledMethod) {
            $credit->update([
                // Se guarda el monto de la venta una sola vez: la primera corrección.
                'original_amount' => $credit->original_amount ?? $credit->amount,
                'amount' => $amount,
                'status' => $settled ? 'paid' : ($paid > 0 ? 'partial' : 'pending'),
                'paid_at' => $settled ? now() : null,
                'paid_method' => $settled ? $settledMethod : null,
            ]);
        });

        EntityChanged::safe($credit->business_id, 'credit', 'updated', $credit->id);

        return $credit->fresh();
    }

    /**
     * Delete a credit. Two very different cases, by design:
     *
     * - No payments at all (paid_amount == 0): nothing real was ever collected, so this reverts
     *   the original sale (appointment back to 'unpaid', or restocks a direct product sale) and
     *   deletes that 'credito' transaction along with the credit — as if the sale never happened.
     *
     * - With payments (fully paid, or partial with a balance left): every dollar collected so far went in via real
     *   abonos, each its own income Transaction (method != 'credito', showing in Finanzas as
     *   "Cobro cita" / "Venta de productos" — see pay()). That income is real and stays exactly
     *   as it is; only the credit's own tracking row goes away. credit_payments cascades on
     *   credit_id (see the 2026_09_02_000001 migration) so its rows disappear too, but its
     *   transaction_id has no reverse cascade — the income Transactions are untouched.
     *
     *   For a partial credit the outstanding balance simply stops being tracked (the screen asks for
     *   confirmation spelling that out): the money collected stays, the sale is not reverted.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        $credit = Credit::where('business_id', $businessId)->find($id);
        if (!$credit) {
            return response()->json(['message' => 'Crédito no encontrado.'], 404);
        }

        DB::transaction(function () use ($credit, $businessId) {
            $hasNoPayments = (float) $credit->paid_amount == 0.0;

            if ($hasNoPayments && $credit->transaction_id) {
                $tx = Transaction::where('business_id', $businessId)->find($credit->transaction_id);
                if ($tx) {
                    if ($tx->appointment_id) {
                        \App\Models\Appointment::where('id', $tx->appointment_id)
                            ->update(['payment_status' => 'unpaid', 'updated_at' => now()]);

                        // Productos vendidos junto con la cita (PosService::processSale) quedan
                        // con reference_type='appointment' y reference_id=appointment_id, no el
                        // id de esta transaccion. Seguro revertirlos aqui sin comprobar otras
                        // transacciones de la cita -- hasNoPayments ya garantiza que esta es la
                        // unica transaccion real que existio para este credito.
                        $movements = \App\Models\InventoryMovement::where('business_id', $businessId)
                            ->where('reference_type', 'appointment')
                            ->where('reference_id', $tx->appointment_id)
                            ->get();

                        foreach ($movements as $movement) {
                            app(\App\Services\InventoryService::class)->adjust([
                                'product_id' => $movement->product_id,
                                'variant_id' => $movement->variant_id,
                                'quantity' => abs($movement->quantity),
                                'location_id' => $movement->location_id,
                                'branch_id' => $movement->branch_id,
                                'unit_cost' => $movement->unit_cost,
                                'reference_type' => 'correction',
                                'reference_id' => $movement->id,
                                'notes' => 'Corrección de crédito eliminado',
                            ], $businessId, request()->user()->id);

                            $movement->delete();
                        }
                    } else {
                        // Revert inventory for a direct product sale made on credit — same
                        // reversal TransactionController::destroy() does for a regular sale.
                        $movements = \App\Models\InventoryMovement::where('business_id', $businessId)
                            ->where('reference_type', 'direct')
                            ->where('reference_id', $tx->id)
                            ->get();

                        foreach ($movements as $movement) {
                            app(\App\Services\InventoryService::class)->adjust([
                                'product_id' => $movement->product_id,
                                'variant_id' => $movement->variant_id,
                                'quantity' => abs($movement->quantity),
                                'location_id' => $movement->location_id,
                                'branch_id' => $movement->branch_id,
                                'unit_cost' => $movement->unit_cost,
                                'reference_type' => 'correction',
                                'reference_id' => $movement->id,
                                'notes' => 'Corrección de crédito eliminado',
                            ], $businessId, request()->user()->id);

                            $movement->delete();
                        }
                    }
                    $tx->delete();
                }
            }

            // Pagado por completo: no se toca ninguna Transaction, solo el credito (y sus
            // credit_payments, por el cascadeOnDelete de la FK).
            $credit->delete();
        });

        EntityChanged::safe($businessId, 'credit', 'deleted', $id);

        return response()->json(null, 204);
    }
}
