<?php

namespace App\Http\Controllers\Api\Staffing;

use App\Events\EntityChanged;
use App\Services\Staffing\StaffingWeeklyExpenseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StaffingWeeklyExpenseController
{
    public function __construct(
        private StaffingWeeklyExpenseService $expenses,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validate([
            'company_id' => 'required|uuid',
            'week_start' => 'required|date',
            'amount' => 'required|numeric',
            'notes' => 'nullable|string',
            'estado_override' => 'nullable|in:paid,pending,no_invoice',
        ]);

        // Distinguish "not sent" (preserve existing override) from "sent as null" (clear it back
        // to automático) — Laravel's validate() drops keys whose value is null, so read it raw.
        if ($request->has('estado_override')) {
            $data['estado_override'] = $request->input('estado_override') ?: null;
        }

        $expense = $this->expenses->upsert($data, $p->business_id, $p->id);
        EntityChanged::safe($p->business_id, 'staffing_weekly_expense', 'updated', $expense->id);

        return response()->json($expense, 201);
    }
}
