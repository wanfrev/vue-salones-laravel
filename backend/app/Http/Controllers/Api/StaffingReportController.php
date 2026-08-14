<?php

namespace App\Http\Controllers\Api;

use App\Services\Staffing\StaffingReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StaffingReportController
{
    public function __construct(
        private StaffingReportService $reports,
    ) {}

    public function headcountMatrix(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['weeks' => [], 'companies' => []]);
        }

        $data = $request->validate([
            'year' => 'required|integer|min:2000|max:2100',
            'status' => 'nullable|in:active,inactive,on_hold',
        ]);

        return response()->json(
            $this->reports->weeklyHeadcountByCompany($p->business_id, (int) $data['year'], $data['status'] ?? null)
        );
    }
}
