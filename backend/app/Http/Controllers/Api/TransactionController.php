<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Models\InventoryMovement;
use App\Services\FinancialSummaryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransactionController
{
    public function __construct(
        private FinancialSummaryService $financialService,
        private \App\Services\InventoryService $inventoryService,
    ) {}

    private function resolveBusinessId(Request $request): ?string
    {
        return $request->user()?->profile?->business_id;
    }

    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) {
            return response()->json([]);
        }

        $query = \App\Models\Transaction::where('business_id', $businessId);

        if ($request->has('appointment_id')) {
            $query->where('appointment_id', $request->get('appointment_id'));
        }

        return response()->json($query->orderByDesc('paid_at')->get());
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);

        $data = $request->validate([
            'total_amount' => 'required|numeric|min:0',
            'method' => 'sometimes|string|max:50',
            'notes' => 'nullable|string|max:500',
            'exchange_rate_used' => 'nullable|numeric|min:0',
            'payments_breakdown' => 'nullable|array',
            'tip_amount' => 'nullable|numeric|min:0',
        ]);

        $tx = \App\Models\Transaction::where('business_id', $businessId)->find($id);
        if (!$tx) {
            return response()->json(['message' => 'Transacción no encontrada.'], 404);
        }

        $newTotal = $data['total_amount'];
        $oldTotal = (float) $tx->total_amount;
        if ($oldTotal > 0 && abs($newTotal - $oldTotal) > 0.001) {
            $ratio = $newTotal / $oldTotal;
            $data['local_amount'] = round((float) $tx->local_amount * $ratio, 2);
            $data['employee_amount'] = round((float) $tx->employee_amount * $ratio, 2);
            $data['assistant_amount'] = round((float) $tx->assistant_amount * $ratio, 2);
            $sum = $data['local_amount'] + $data['employee_amount'] + $data['assistant_amount'];
            $diff = round($newTotal - $sum, 2);
            $data['local_amount'] = round($data['local_amount'] + $diff, 2);
        }

        $tx->update($data);

        EntityChanged::safe($businessId, 'transaction', 'updated', $id);

        return response()->json($tx->fresh());
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);

        $tx = \App\Models\Transaction::where('business_id', $businessId)->find($id);
        if (!$tx) {
            return response()->json(['message' => 'Transacción no encontrada.'], 404);
        }

        DB::transaction(function () use ($tx, $businessId) {
            if ($tx->appointment_id) {
                $appointment = \App\Models\Appointment::find($tx->appointment_id);
                if ($appointment) {
                    $appointment->update(['payment_status' => 'unpaid', 'updated_at' => now()]);
                }
            }

            // Revert inventory movements for direct sales
            if (!$tx->appointment_id) {
                $movements = InventoryMovement::where('business_id', $businessId)
                    ->where('reference_type', 'direct')
                    ->where('reference_id', $tx->id)
                    ->get();

                foreach ($movements as $movement) {
                    $this->inventoryService->adjust([
                        'product_id' => $movement->product_id,
                        'variant_id' => $movement->variant_id,
                        'quantity' => abs($movement->quantity),
                        'location_id' => $movement->location_id,
                        'branch_id' => $movement->branch_id,
                        'unit_cost' => $movement->unit_cost,
                        'reference_type' => 'correction',
                        'reference_id' => $movement->id,
                        'notes' => 'Corrección de venta eliminada',
                    ], $businessId, request()->user()->id);

                    $movement->delete();
                }
            }

            $tx->delete();
        });

        EntityChanged::safe($businessId, 'transaction', 'deleted', $id);

        return response()->json(null, 204);
    }
}
