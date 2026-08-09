<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Services\Staffing\StaffingCompanyPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StaffingCompanyPaymentController
{
    public function __construct(
        private StaffingCompanyPaymentService $payments,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        return response()->json(
            $this->payments->list($p->business_id, $request->company_id)
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
            'invoice_id' => 'nullable|uuid',
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'nullable|string|max:50',
            'payment_date' => 'required|date',
            'reference' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $payment = $this->payments->store($data, $p->business_id, $p->id);
        EntityChanged::safe($p->business_id, 'staffing_company_payment', 'created', $payment->id);

        return response()->json($payment, 201);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;

        $this->payments->destroy($id, $p?->business_id ?? '');
        EntityChanged::safe($p?->business_id, 'staffing_company_payment', 'deleted', $id);

        return response()->json(null, 204);
    }
}
