<?php

namespace App\Http\Controllers\Api\Staffing;

use App\Events\EntityChanged;
use App\Services\Staffing\StaffingTimesheetService;
use App\Services\Staffing\StaffingXlsxExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StaffingTimesheetController
{
    public function __construct(
        private StaffingTimesheetService $timesheets,
        private StaffingXlsxExportService $xlsxExport,
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

        // Unlike index() below, '' must NOT collapse into null here: the query string
        // distinguishes "General (Sin proyecto)" (?project_id= — filter to project_id IS NULL)
        // from the param being absent entirely (no project filter at all — every project's
        // assignments, which only RateCardEditor's unscoped headcount call wants). Collapsing
        // both to null made the General tab fan out one row per project a worker is assigned
        // to, instead of just the project-less assignment. See
        // StaffingCompanyEmployeeService::employeesForCompany.
        $projectId = $request->project_id;
        if ($projectId === 'null' || $projectId === 'undefined') {
            $projectId = null;
        }

        return response()->json(
            $this->timesheets->employeesForCompany($p->business_id, $companyId, $projectId)
        );
    }

    /** Pauses/reactivates one worker's assignment at one company — see setEmployeeActive on the service. */
    public function setEmployeeActive(Request $request, string $assignmentId): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validate(['active' => 'required|boolean']);

        $this->timesheets->setEmployeeActive($assignmentId, $p->business_id, $data['active']);

        return response()->json(['success' => true]);
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
            // Disambiguates which of an employee's roles at this company an entry is for — needed
            // now that the same person can hold two roles at one company (see
            // StaffingCompanyEmployeeService::assignmentFor). Optional for backward compatibility
            // with a single-role employee, where it's unambiguous without it.
            'entries.*.role' => 'nullable|string|max:120',
            // Disambiguates further when the employee holds two assignments with the same role
            // that differ only by shift (see StaffingCompanyEmployeeService::assignmentFor).
            'entries.*.shift' => 'nullable|string|max:60',
            'entries.*.total_hours' => 'required|numeric|min:0|max:168',
            'entries.*.pre_tax_deduction' => 'nullable|numeric|min:0',
            'entries.*.fixed_fees' => 'nullable|numeric|min:0',
            // Adjustments are signed — a negative one claws money back (see the HILTON (2) sheet).
            'entries.*.adjustment' => 'nullable|numeric',
            // When true, manual_regular_hours/manual_overtime_hours below replace the threshold
            // split entirely — see StaffingPayrollCalculator::splitHours().
            'entries.*.hours_manual_override' => 'nullable|boolean',
            'entries.*.manual_regular_hours' => 'nullable|numeric|min:0',
            'entries.*.manual_overtime_hours' => 'nullable|numeric|min:0',
            // Reimbursement-style amounts, entered as a total dollar figure directly (not
            // days/hours × a rate), folded into net/payout but never billed — see
            // StaffingTimesheetService::saveWeek().
            'entries.*.perdiem_total' => 'nullable|numeric|min:0',
            'entries.*.travel_total' => 'nullable|numeric|min:0',
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

    public function downloadXlsx(Request $request, string $id): StreamedResponse|JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $timesheet = $this->timesheets->findForBusiness($id, $p->business_id);
        $spreadsheet = $this->xlsxExport->payrollWorkbook($timesheet);
        $writer = new Xlsx($spreadsheet);

        $filename = 'nomina-' . ($timesheet->company?->name ?? 'empresa') . '-' . $timesheet->week_start->format('Y-m-d') . '.xlsx';
        $filename = preg_replace('/[^A-Za-z0-9._-]+/', '_', $filename);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
