<?php

namespace App\Http\Controllers\Api\Staffing;

use App\Services\Staffing\StaffingSpreadsheetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * No `admin-panel` on this group's route (see routes/api.php) — a vendedora with Spreadsheet
 * access must reach these, same reasoning as LeadController for CRM. Access is instead checked
 * per-method here: vendedoras() is admin-only (it's the access-management roster), the other two
 * are admin OR an empleado/encargado whose own can_access_spreadsheet flag is on.
 */
class StaffingSpreadsheetController
{
    public function __construct(
        private StaffingSpreadsheetService $spreadsheet,
    ) {}

    private function isAdmin(?object $profile): bool
    {
        return $profile && in_array($profile->role, ['admin', 'superadmin', 'encargado'], true);
    }

    private function canUseModule(?object $profile): bool
    {
        if (!$profile) {
            return false;
        }

        return $this->isAdmin($profile) || (bool) $profile->can_access_spreadsheet;
    }

    /**
     * The access-management roster shown inside the module — admin-only, same in-controller
     * check as LeadController::vendedoras() (no admin-panel middleware, so a vendedora reaching
     * this legitimately gets []).
     */
    public function vendedoras(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id || !$this->isAdmin($p)) {
            return response()->json([]);
        }

        return response()->json($this->spreadsheet->vendedoraRoster($p->business_id));
    }

    public function companies(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id || !$this->canUseModule($p)) {
            return response()->json([]);
        }

        return response()->json($this->spreadsheet->companies($p->business_id));
    }

    public function companyEmployeeRates(Request $request, string $companyId): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id || !$this->canUseModule($p)) {
            return response()->json([]);
        }

        return response()->json($this->spreadsheet->companyEmployeeRates($p->business_id, $companyId));
    }
}
