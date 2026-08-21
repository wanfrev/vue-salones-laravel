<?php

namespace App\Http\Controllers\Api\Staffing;

use App\Events\EntityChanged;
use App\Services\Staffing\StaffingInvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class StaffingInvoiceController
{
    public function __construct(
        private StaffingInvoiceService $invoices,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        return response()->json(
            $this->invoices->list($p->business_id, $request->company_id, $request->project_id)
        );
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;

        return response()->json($this->invoices->findForBusiness($id, $p?->business_id ?? ''));
    }

    public function generate(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validate([
            'timesheet_id' => 'required|uuid',
        ]);

        try {
            $invoice = $this->invoices->generateFromTimesheet($p->business_id, $data['timesheet_id']);
        } catch (RuntimeException $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 422);
        }

        EntityChanged::safe($p->business_id, 'staffing_invoice', 'created', $invoice->id);

        return response()->json($invoice, 201);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $timesheetId = $this->invoices->destroy($id, $p->business_id);

        EntityChanged::safe($p->business_id, 'staffing_invoice', 'deleted', $id);
        EntityChanged::safe($p->business_id, 'staffing_timesheet', 'updated', $timesheetId);

        return response()->json(null, 204);
    }

    public function balance(Request $request, string $companyId): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['invoiced' => 0, 'paid' => 0, 'pending' => 0]);
        }

        return response()->json($this->invoices->balanceForCompany($p->business_id, $companyId));
    }
}
