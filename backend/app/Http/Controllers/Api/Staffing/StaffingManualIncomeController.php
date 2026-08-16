<?php

namespace App\Http\Controllers\Api\Staffing;

use App\Events\EntityChanged;
use App\Services\Staffing\StaffingManualIncomeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StaffingManualIncomeController
{
    public function __construct(
        private StaffingManualIncomeService $incomes,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        $data = $request->validate([
            'from' => 'required|date',
            'to' => 'required|date|after_or_equal:from',
        ]);

        return response()->json(
            $this->incomes->list($p->business_id, $data['from'], $data['to'])
        );
    }

    public function store(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validate([
            'income_date' => 'required|date',
            'amount' => 'required|numeric|min:0.01',
            'notes' => 'nullable|string',
        ]);

        $income = $this->incomes->store($data, $p->business_id, $p->id);
        EntityChanged::safe($p->business_id, 'staffing_manual_income', 'created', $income->id);

        return response()->json($income, 201);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $this->incomes->destroy($id, $p->business_id);
        EntityChanged::safe($p->business_id, 'staffing_manual_income', 'deleted', $id);

        return response()->json(null, 204);
    }
}
