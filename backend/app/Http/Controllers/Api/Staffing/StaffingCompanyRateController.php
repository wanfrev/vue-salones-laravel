<?php

namespace App\Http\Controllers\Api\Staffing;

use App\Events\EntityChanged;
use App\Services\Staffing\StaffingRateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StaffingCompanyRateController
{
    public function __construct(
        private StaffingRateService $rates,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        return response()->json(
            $this->rates->list($p->business_id, $request->company_id)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validate([
            'company_id' => 'required|uuid',
            'role' => 'required|string|max:120',
            'pay_rate' => 'required|numeric|min:0',
            'bill_rate' => 'required|numeric|min:0',
            // Null falls back to the company's own overtime terms — see StaffingTermsFactory.
            'overtime_threshold_hours' => 'nullable|numeric|min:0|max:168',
            'overtime_multiplier' => 'nullable|numeric|min:1|max:5',
            // Explicit OT $/hour, independent of each other and of overtime_multiplier — see
            // StaffingPayrollCalculator, which prefers these outright when set.
            'overtime_pay_rate' => 'nullable|numeric|min:0',
            'overtime_bill_rate' => 'nullable|numeric|min:0',
            'active' => 'boolean',
        ]);

        $rate = $this->rates->store($data, $p->business_id);
        EntityChanged::safe($p->business_id, 'staffing_company_rate', 'created', $rate->id);

        return response()->json($rate, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;

        $data = $request->validate([
            'role' => 'sometimes|string|max:120',
            'pay_rate' => 'sometimes|numeric|min:0',
            'bill_rate' => 'sometimes|numeric|min:0',
            'overtime_threshold_hours' => 'nullable|numeric|min:0|max:168',
            'overtime_multiplier' => 'nullable|numeric|min:1|max:5',
            'overtime_pay_rate' => 'nullable|numeric|min:0',
            'overtime_bill_rate' => 'nullable|numeric|min:0',
            'active' => 'boolean',
        ]);

        $rate = $this->rates->update($id, $data, $p?->business_id);
        EntityChanged::safe($p?->business_id, 'staffing_company_rate', 'updated', $id);

        return response()->json($rate);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;

        $this->rates->destroy($id, $p?->business_id);
        EntityChanged::safe($p?->business_id, 'staffing_company_rate', 'deleted', $id);

        return response()->json(null, 204);
    }
}
