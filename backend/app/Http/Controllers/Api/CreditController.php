<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Models\Credit;
use App\Models\CreditPayment;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

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

        $query = Credit::where('business_id', $businessId)
            ->with('client:id,full_name,phone');

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
        ]);

        $payment = DB::transaction(function () use ($credit, $data, $businessId, $request) {
            $currency = $data['currency'] ?? 'USD';
            $rate = (float) ($data['exchange_rate'] ?? 1);
            $amount = (float) $data['amount'];

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
                ]],
                'created_by' => $request->user()?->id,
                'notes' => "Abono a crédito de {$credit->client_name}",
                'paid_at' => now(),
            ]);

            $creditPayment = CreditPayment::create([
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

            $newPaidAmount = round((float) $credit->paid_amount + $amount, 2);
            $isFullySettled = $newPaidAmount >= (float) $credit->amount - 0.005;

            $credit->update([
                'paid_amount' => $newPaidAmount,
                'status' => $isFullySettled ? 'paid' : 'partial',
                'paid_at' => $isFullySettled ? now() : $credit->paid_at,
                'paid_method' => $isFullySettled ? $data['method'] : $credit->paid_method,
            ]);

            return $creditPayment;
        });

        EntityChanged::safe($businessId, 'credit', 'updated', $id);

        return response()->json([
            'credit' => $credit->fresh()->load('client:id,full_name,phone'),
            'payment' => $payment,
        ]);
    }

    /**
     * Delete a credit that was created by mistake. Only allowed while it has zero payments
     * against it — a partial/full payment already produced a real income Transaction, and
     * silently deleting the credit would leave that money uncoupled from any credit record
     * (or, worse, tempt a future version of this endpoint into cascading the deletion into
     * that income too). Force the user to sort out the payments first instead.
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

        if ((float) $credit->paid_amount > 0) {
            return response()->json([
                'message' => 'No se puede eliminar un crédito con abonos registrados.',
            ], 422);
        }

        DB::transaction(function () use ($credit, $businessId) {
            if ($credit->transaction_id) {
                $tx = Transaction::where('business_id', $businessId)->find($credit->transaction_id);
                if ($tx) {
                    if ($tx->appointment_id) {
                        \App\Models\Appointment::where('id', $tx->appointment_id)
                            ->update(['payment_status' => 'unpaid', 'updated_at' => now()]);
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

            $credit->delete();
        });

        EntityChanged::safe($businessId, 'credit', 'deleted', $id);

        return response()->json(null, 204);
    }
}
