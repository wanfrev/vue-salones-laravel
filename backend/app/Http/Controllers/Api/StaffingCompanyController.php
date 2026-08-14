<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Services\Staffing\PayrollTerms;
use App\Services\Staffing\StaffingCompanyService;
use App\Services\Staffing\TaxRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StaffingCompanyController
{
    public function __construct(
        private StaffingCompanyService $companies,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        $active = null;
        if ($request->has('active')) {
            $active = filter_var($request->input('active'), FILTER_VALIDATE_BOOL);
        }

        $status = $request->input('status');
        if ($status === 'all') {
            $status = null;
            $active = null;
        }

        return response()->json(
            $this->companies->list($p->business_id, $request->branch_id, $active, $status)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validate($this->rules());

        $company = $this->companies->store($data, $p->business_id);
        EntityChanged::safe($p->business_id, 'staffing_company', 'created', $company->id);

        return response()->json($company, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;

        $data = $request->validate($this->rules(forUpdate: true));

        $company = $this->companies->update($id, $data, $p?->business_id);
        EntityChanged::safe($p?->business_id, 'staffing_company', 'updated', $id);

        return response()->json($company);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;

        $this->companies->destroy($id, $p?->business_id);
        EntityChanged::safe($p?->business_id, 'staffing_company', 'deleted', $id);

        return response()->json(null, 204);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(bool $forUpdate = false): array
    {
        return [
            'name' => ($forUpdate ? 'sometimes' : 'required') . '|string|max:255',
            'legal_name' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:120',
            'state' => 'nullable|string|max:120',
            'zip' => 'nullable|string|max:20',
            'work_site' => 'nullable|string|max:255',
            'contact_name' => 'nullable|string|max:255',
            'contact_phone' => 'nullable|string|max:50',
            'contact_email' => 'nullable|email|max:255',
            'payment_terms_days' => 'nullable|integer|min:0|max:365',
            'overtime_threshold_hours' => 'nullable|numeric|min:0|max:168',
            'overtime_multiplier' => 'nullable|numeric|min:1|max:5',
            // Ordered brackets; a null threshold marks the catch-all tier.
            'tax_brackets' => 'nullable|array',
            'tax_brackets.*.threshold' => 'nullable|numeric|min:0',
            'tax_brackets.*.rate' => 'required_with:tax_brackets|numeric|min:0|max:1',
            'tax_destination' => 'nullable|in:' . TaxRule::REMITTED . ',' . TaxRule::RETAINED,
            'payout_rounding' => 'nullable|in:'
                . PayrollTerms::PAYOUT_FLOOR . ','
                . PayrollTerms::PAYOUT_CENT . ','
                . PayrollTerms::PAYOUT_EXACT,
            'notes' => 'nullable|string',
            'active' => 'boolean',
            'status' => 'nullable|in:active,inactive,on_hold',
            'branch_id' => 'nullable|uuid',
        ];
    }
}
