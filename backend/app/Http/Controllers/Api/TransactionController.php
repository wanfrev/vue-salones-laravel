<?php

namespace App\Http\Controllers\Api;

use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionController
{
    /**
     * GET /api/transactions
     * Returns transactions with nested appointments, clients, services, profiles.
     * Response shape matches PostgREST format expected by useFinancialSummary.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $p = $user?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        $query = Transaction::with([
            'appointment' => function ($q) {
                $q->with(['client', 'service', 'employeeProfile', 'assistantProfile']);
            },
        ])
        ->where('business_id', $p->business_id)
        ->orderByDesc('created_at');

        if ($request->get('start')) {
            $query->where('created_at', '>=', $request->get('start'));
        }
        if ($request->get('end')) {
            $query->where('created_at', '<=', $request->get('end'));
        }
        if ($request->branch_id) {
            $query->where('branch_id', $request->branch_id);
        }

        $transactions = $query->get();

        // Format response to match PostgREST nested style:
        // { id, total_amount, ..., appointments: { clients: { full_name }, services: { name }, employee_profile: { ... } } }
        $data = $transactions->map(function ($tx) {
            $appt = $tx->appointment;
            return [
                'id' => $tx->id,
                'appointment_id' => $tx->appointment_id,
                'paid_at' => $tx->paid_at,
                'created_at' => $tx->created_at,
                'total_amount' => $tx->total_amount,
                'method' => $tx->method,
                'employee_percentage' => $tx->employee_percentage,
                'assistant_amount' => $tx->assistant_amount,
                'assistant_percentage' => $tx->assistant_percentage,
                'exchange_rate_used' => $tx->exchange_rate_used,
                'payments_breakdown' => $tx->payments_breakdown,
                'notes' => $tx->notes,
                'tip_amount' => $tx->tip_amount,
                'appointments' => $appt ? [
                    'client_id' => $appt->client_id,
                    'service_id' => $appt->service_id,
                    'employee_id' => $appt->employee_id,
                    'assistant_employee_id' => $appt->assistant_employee_id,
                    'assistant_percentage' => $appt->assistant_percentage,
                    'employee_percentage_override' => $appt->employee_percentage_override,
                    'group_id' => $appt->group_id,
                    'clients' => $appt->client ? ['full_name' => $appt->client->full_name] : null,
                    'services' => $appt->service ? ['name' => $appt->service->name] : null,
                    'employee_profile' => $appt->employeeProfile ? [
                        'full_name' => $appt->employeeProfile->full_name,
                        'pay_type' => $appt->employeeProfile->pay_type,
                        'pay_percentage' => $appt->employeeProfile->pay_percentage,
                        'base_salary' => $appt->employeeProfile->base_salary,
                    ] : null,
                    'assistant_profile' => $appt->assistantProfile ? [
                        'full_name' => $appt->assistantProfile->full_name,
                        'pay_type' => $appt->assistantProfile->pay_type,
                        'pay_percentage' => $appt->assistantProfile->pay_percentage,
                        'base_salary' => $appt->assistantProfile->base_salary,
                    ] : null,
                ] : null,
            ];
        });

        return response()->json($data);
    }
}
