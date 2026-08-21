<?php

namespace App\Http\Controllers\Api\Staffing;

use App\Events\EntityChanged;
use App\Services\Staffing\StaffingTimesheetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class StaffingTimesheetController
{
    public function __construct(
        private StaffingTimesheetService $timesheets,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        $projectId = $request->project_id;
        if ($projectId === 'null' || $projectId === 'undefined' || $projectId === '') {
            $projectId = null;
        }

        return response()->json(
            $this->timesheets->list($p->business_id, $request->company_id, $projectId)
        );
    }

    public function employeesForCompany(Request $request, string $companyId): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        $projectId = $request->project_id;
        if ($projectId === 'null' || $projectId === 'undefined' || $projectId === '') {
            $projectId = null;
        }

        return response()->json(
            $this->timesheets->employeesForCompany($p->business_id, $companyId, $projectId)
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
            'project_id' => 'nullable|uuid',
            'week_start' => 'required|date',
            'week_end' => 'required|date|after_or_equal:week_start',
            'entries' => 'required|array|min:1',
            'entries.*.employee_id' => 'required|uuid',
            'entries.*.total_hours' => 'required|numeric|min:0|max:168',
            'entries.*.pre_tax_deduction' => 'nullable|numeric|min:0',
            'entries.*.fixed_fees' => 'nullable|numeric|min:0',
            // Adjustments are signed — a negative one claws money back (see the HILTON (2) sheet).
            'entries.*.adjustment' => 'nullable|numeric',
        ]);

        try {
            $timesheet = $this->timesheets->saveWeek(
                $p->business_id,
                $data['company_id'],
                $data['project_id'] ?? null,
                $data['week_start'],
                $data['week_end'],
                $data['entries'],
                $request->user()->id,
            );
        } catch (RuntimeException $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 422);
        }

        EntityChanged::safe($p->business_id, 'staffing_timesheet', 'updated', $timesheet->id);

        return response()->json($timesheet, 201);
    }

    public function approve(Request $request, string $id): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;

        try {
            $timesheet = $this->timesheets->approve($id, $p?->business_id ?? '');
        } catch (RuntimeException $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 422);
        }

        EntityChanged::safe($p?->business_id, 'staffing_timesheet', 'approved', $id);

        return response()->json($timesheet);
    }

    public function markPaid(Request $request, string $id): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;

        try {
            $timesheet = $this->timesheets->markPaid($id, $p?->business_id ?? '');
        } catch (RuntimeException $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 422);
        }

        EntityChanged::safe($p?->business_id, 'staffing_timesheet', 'paid', $id);

        return response()->json($timesheet);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;

        try {
            $this->timesheets->destroy($id, $p?->business_id ?? '');
        } catch (RuntimeException $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 422);
        }

        EntityChanged::safe($p?->business_id, 'staffing_timesheet', 'deleted', $id);

        return response()->json(null, 204);
    }
}
