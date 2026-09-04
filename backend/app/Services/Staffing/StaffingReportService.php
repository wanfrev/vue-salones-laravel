<?php

namespace App\Services\Staffing;

use App\Models\Profile;
use App\Models\StaffingAnnualTax;
use App\Models\StaffingCompany;
use App\Models\StaffingCompanyPayment;
use App\Models\StaffingInvoice;
use App\Models\StaffingTaxEntity;
use App\Models\StaffingTaxEntry;
use App\Models\StaffingTimesheet;
use App\Models\StaffingWeeklyExpense;
use DateTimeImmutable;
use DateTimeInterface;
use Illuminate\Support\Facades\DB;

/**
 * Read-side aggregations across a whole year of timesheets — the "matrix" views the client's
 * spreadsheets already have (one row per company/employee, one column per week). Every method
 * here is careful to stay at O(1) queries regardless of how many companies/weeks exist: a single
 * grouped aggregate query, then a PHP-side zip against the roster, never a query per row.
 */
class StaffingReportService
{
    /**
     * The year's Sunday-anchored weeks: the first Sunday on/before Jan 1 through the last Sunday
     * on/before Dec 31. Mirrors the frontend's own `defaultWeekStart()` convention (Sunday to
     * Saturday), so a week spanning e.g. Dec 28, 2025 -> Jan 3, 2026 is included under "2026"
     * the same way the client's own sheets show it.
     *
     * @return list<array{week_start: string, week_end: string, label: string}>
     */
    public function weeksForYear(int $year): array
    {
        $jan1 = new DateTimeImmutable("{$year}-01-01");
        $firstSunday = $jan1->modify('-' . $jan1->format('w') . ' days');

        $dec31 = new DateTimeImmutable("{$year}-12-31");
        $lastSunday = $dec31->modify('-' . $dec31->format('w') . ' days');

        $weeks = [];
        $cursor = $firstSunday;
        while ($cursor <= $lastSunday) {
            $weekEnd = $cursor->modify('+6 days');
            $weeks[] = [
                'week_start' => $cursor->format('Y-m-d'),
                'week_end' => $weekEnd->format('Y-m-d'),
                'label' => $cursor->format('m/d/Y') . ' al ' . $weekEnd->format('m/d/Y'),
            ];
            $cursor = $cursor->modify('+7 days');
        }

        return $weeks;
    }

    /**
     * Per company, per week of the year: how many distinct employees had hours logged.
     *
     * @return array{weeks: list<array{week_start: string, week_end: string, label: string}>, companies: list<array>}
     */
    public function weeklyHeadcountByCompany(string $businessId, int $year, ?string $status = null): array
    {
        $weeks = $this->weeksForYear($year);
        if ($weeks === []) {
            return ['weeks' => [], 'companies' => []];
        }

        $companiesQuery = StaffingCompany::query()
            ->where('business_id', $businessId)
            ->orderBy('name');

        if ($status !== null) {
            $companiesQuery->where('status', $status);
        }

        $companies = $companiesQuery->get();
        if ($companies->isEmpty()) {
            return ['weeks' => $weeks, 'companies' => []];
        }

        $firstWeekStart = $weeks[0]['week_start'];
        $lastWeekStart = $weeks[count($weeks) - 1]['week_start'];

        $rows = DB::table('staffing_timesheet_entries as ste')
            ->join('staffing_timesheets as st', 'st.id', '=', 'ste.timesheet_id')
            ->where('st.business_id', $businessId)
            ->whereBetween('st.week_start', [$firstWeekStart, $lastWeekStart])
            ->where('ste.total_hours', '>', 0)
            ->selectRaw('st.company_id, st.week_start, COUNT(DISTINCT ste.employee_id) as headcount')
            ->groupBy('st.company_id', 'st.week_start')
            ->get();

        // company_id => week_start (Y-m-d string) => headcount
        $byCompany = [];
        foreach ($rows as $row) {
            $byCompany[$row->company_id][$this->normalizeDate($row->week_start)] = (int) $row->headcount;
        }

        return [
            'weeks' => $weeks,
            'companies' => $companies->map(fn (StaffingCompany $company) => [
                'companyId' => $company->id,
                'name' => $company->name,
                'status' => $company->status,
                'weeklyHeadcount' => $byCompany[$company->id] ?? [],
            ])->all(),
        ];
    }

    /**
     * Payroll (payout) total per company for each week that STARTS in the given month — matches
     * the client's "REPORTE DE NOMINA" sheet, which has one column per Sunday-anchored week of
     * the calendar month (4 or 5 of them), not per exact calendar-week overlap.
     *
     * @return array{weeks: list<array{week_start: string, week_end: string, label: string}>, companies: list<array>}
     */
    public function monthlyPayrollByCompany(string $businessId, int $year, int $month): array
    {
        $weeks = array_values(array_filter(
            $this->weeksForYear($year),
            fn (array $w) => (int) substr($w['week_start'], 5, 2) === $month,
        ));

        $companies = StaffingCompany::query()
            ->where('business_id', $businessId)
            ->orderBy('name')
            ->get();

        if ($weeks === [] || $companies->isEmpty()) {
            return ['weeks' => $weeks, 'companies' => []];
        }

        $weekStarts = array_column($weeks, 'week_start');

        // Grouped by project too (not just company+week) so each cell can carry which timesheet
        // it came from — a company can run several projects the same week, each its own separate
        // timesheet (see the partial unique indexes in 2026_08_20_100001_add_project_id_to_staffing_tables),
        // so "the" project for a cell is only unambiguous when just one contributed to it.
        $rows = DB::table('staffing_timesheet_entries as ste')
            ->join('staffing_timesheets as st', 'st.id', '=', 'ste.timesheet_id')
            ->where('st.business_id', $businessId)
            ->whereIn('st.week_start', $weekStarts)
            ->selectRaw('st.company_id, st.week_start, st.project_id, SUM(ste.payout) as nomina')
            ->groupBy('st.company_id', 'st.week_start', 'st.project_id')
            ->get();

        $byCompany = [];
        // company_id => week_start => [project_id => nomina], to pick the deep-link target below.
        $projectsByCompanyWeek = [];
        foreach ($rows as $row) {
            $weekStart = $this->normalizeDate($row->week_start);
            $byCompany[$row->company_id][$weekStart] = ($byCompany[$row->company_id][$weekStart] ?? 0.0) + (float) $row->nomina;
            $projectsByCompanyWeek[$row->company_id][$weekStart][$row->project_id ?? ''] = (float) $row->nomina;
        }

        return [
            'weeks' => $weeks,
            'companies' => $companies->map(function (StaffingCompany $company) use ($byCompany, $projectsByCompanyWeek, $weekStarts) {
                $weekly = $byCompany[$company->id] ?? [];
                $total = array_sum(array_map(fn ($ws) => $weekly[$ws] ?? 0.0, $weekStarts));

                // The project behind this week's number, so clicking it opens Nómina already
                // scoped there instead of defaulting to "General" and showing nobody. Usually
                // there's only one; when several projects contributed the same week, the biggest
                // one by payout is still a far better landing spot than an empty "General" that
                // matches none of them.
                $weeklyProjectId = [];
                foreach ($projectsByCompanyWeek[$company->id] ?? [] as $weekStart => $projects) {
                    arsort($projects);
                    $weeklyProjectId[$weekStart] = array_key_first($projects) ?: null;
                }

                return [
                    'companyId' => $company->id,
                    'name' => $company->name,
                    'weeklyPayroll' => $weekly,
                    'weeklyProjectId' => $weeklyProjectId,
                    'total' => $total,
                ];
            })->all(),
        ];
    }

    /**
     * The weekly financial summary per company — nomina/invoice/gross-profit/overhead/otros
     * gastos/total/headcount/estado, matching the client's "RESULTADOS SEMANALES" sheet. `estado`
     * is modeled as the invoice's payment status (paid/pending/no_invoice), and the "4%" as a
     * per-company agency overhead rate applied to gross profit — both flagged in the plan as
     * assumptions to confirm; every number here stays editable (weekly expense) or per-company
     * configurable (overhead rate) so a wrong assumption is a one-field fix, not a migration.
     *
     * @return list<array>
     */
    public function weeklyCompanyReport(string $businessId, string $weekStart): array
    {
        $companies = StaffingCompany::query()
            ->where('business_id', $businessId)
            ->orderBy('name')
            ->get();

        if ($companies->isEmpty()) {
            return [];
        }

        // A company can have more than one timesheet in the same week now — one per project, plus
        // an optional general one — so these are grouped (not keyed 1:1) per company and summed
        // below, instead of collapsing to whichever row happened to come back last.
        $entryTotals = DB::table('staffing_timesheet_entries as ste')
            ->join('staffing_timesheets as st', 'st.id', '=', 'ste.timesheet_id')
            ->where('st.business_id', $businessId)
            ->where('st.week_start', $weekStart)
            ->selectRaw('st.company_id, st.id as timesheet_id, SUM(ste.payout) as nomina, SUM(ste.invoice_total) as invoice, COUNT(DISTINCT ste.employee_id) as headcount')
            ->groupBy('st.company_id', 'st.id')
            ->get()
            ->groupBy('company_id');

        $timesheetIds = $entryTotals->flatten(1)->pluck('timesheet_id')->filter()->values();

        $invoicesByTimesheet = StaffingInvoice::where('business_id', $businessId)
            ->whereIn('timesheet_id', $timesheetIds)
            ->get()
            ->keyBy('timesheet_id');

        $invoiceIds = $invoicesByTimesheet->pluck('id')->values();

        $paidByInvoice = StaffingCompanyPayment::where('business_id', $businessId)
            ->whereIn('invoice_id', $invoiceIds)
            ->selectRaw('invoice_id, SUM(amount) as paid')
            ->groupBy('invoice_id')
            ->get()
            ->keyBy('invoice_id');

        $expensesByCompany = StaffingWeeklyExpense::where('business_id', $businessId)
            ->where('week_start', $weekStart)
            ->get()
            ->keyBy('company_id');

        return $companies->map(function (StaffingCompany $company) use ($entryTotals, $invoicesByTimesheet, $paidByInvoice, $expensesByCompany) {
            $entries = $entryTotals->get($company->id) ?? collect();
            $nomina = (float) $entries->sum('nomina');
            $invoiceTotal = (float) $entries->sum('invoice');
            $headcount = (int) $entries->sum('headcount');

            $grossProfit = $invoiceTotal - $nomina;
            $overheadRate = $company->agency_overhead_rate ?? 0.04;
            $overhead = $grossProfit * $overheadRate;

            $expense = $expensesByCompany->get($company->id);
            $otrosGastos = $expense ? (float) $expense->amount : 0.0;

            $total = $grossProfit - $overhead - $otrosGastos;

            // A company can have several timesheets this week now (one per project) — collect
            // every invoice tied to any of them. 'paid' only when all are fully paid, 'pending'
            // if at least one invoice exists but isn't, 'no_invoice' when none of them are billed.
            $invoicesForWeek = $entries
                ->map(fn ($entry) => $invoicesByTimesheet->get($entry->timesheet_id))
                ->filter();
            $autoEstado = 'no_invoice';
            if ($invoicesForWeek->isNotEmpty()) {
                $allPaid = $invoicesForWeek->every(function ($invoice) use ($paidByInvoice) {
                    $paid = $paidByInvoice->get($invoice->id)?->paid ?? 0.0;
                    return (float) $paid >= (float) $invoice->total;
                });
                $autoEstado = $allPaid ? 'paid' : 'pending';
            }
            // The PDF wants "estado" both auto-filled and editable — an admin's manual override
            // (e.g. paid outside the app) wins over the computed value, null means "automático".
            $estadoOverride = $expense?->estado_override;
            $estado = $estadoOverride ?? $autoEstado;

            return [
                'companyId' => $company->id,
                'name' => $company->name,
                'estado' => $estado,
                'estadoAuto' => $autoEstado,
                'estadoOverride' => $estadoOverride,
                'proyecto' => $company->work_site,
                'nomina' => $nomina,
                'invoice' => $invoiceTotal,
                'gananciaBruta' => $grossProfit,
                'overheadRate' => $overheadRate,
                'overhead' => $overhead,
                'otrosGastos' => $otrosGastos,
                'total' => $total,
                'empleados' => $headcount,
            ];
        })->all();
    }

    /**
     * Hours per employee per week of the year, for active staff, inactive staff, or everyone —
     * the "Horas Reportadas" sheet. `$activeOnly === null` ("Todos") is the one that matters for
     * a past period: a worker deactivated in week 30 still worked weeks 1-29, and splitting the
     * table by their *current* status hid that entire row under "Inactivos" the moment they left,
     * reading as if their past hours had vanished rather than just moved tabs. Which companies an
     * employee worked for is derived from their actual timesheet entries, not the single
     * profiles.staffing_company_id FK: the PDF is explicit an employee can have hours against one
     * or two companies in the same year ("si son dos o una").
     *
     * @return array{weeks: list<array{week_start: string, week_end: string, label: string}>, employees: list<array>}
     */
    public function employeeHoursMatrix(string $businessId, int $year, ?bool $activeOnly): array
    {
        $weeks = $this->weeksForYear($year);

        $employees = Profile::query()
            ->where('business_id', $businessId)
            ->when($activeOnly !== null, fn ($q) => $q->where('active', $activeOnly))
            ->orderBy('full_name')
            ->get();

        if ($weeks === [] || $employees->isEmpty()) {
            return ['weeks' => $weeks, 'employees' => []];
        }

        $firstWeekStart = $weeks[0]['week_start'];
        $lastWeekStart = $weeks[count($weeks) - 1]['week_start'];

        $entryRows = DB::table('staffing_timesheet_entries as ste')
            ->join('staffing_timesheets as st', 'st.id', '=', 'ste.timesheet_id')
            ->where('st.business_id', $businessId)
            ->whereBetween('st.week_start', [$firstWeekStart, $lastWeekStart])
            ->where('ste.total_hours', '>', 0)
            ->selectRaw('ste.employee_id, st.company_id, st.week_start, ste.total_hours')
            ->get();

        $companyNames = StaffingCompany::where('business_id', $businessId)->pluck('name', 'id');

        // employee_id => [companyId => true] (dedup via keys), employee_id => week_start => hours
        $companiesByEmployee = [];
        $hoursByEmployee = [];
        foreach ($entryRows as $row) {
            $companiesByEmployee[$row->employee_id][$row->company_id] = true;
            $weekStart = $this->normalizeDate($row->week_start);
            $hoursByEmployee[$row->employee_id][$weekStart] = ($hoursByEmployee[$row->employee_id][$weekStart] ?? 0.0) + (float) $row->total_hours;
        }

        return [
            'weeks' => $weeks,
            'employees' => $employees->map(function (Profile $employee) use ($companiesByEmployee, $hoursByEmployee, $companyNames) {
                $companyIds = array_keys($companiesByEmployee[$employee->id] ?? []);

                return [
                    'employeeId' => $employee->id,
                    'name' => $employee->full_name,
                    'active' => (bool) $employee->active,
                    'paymentMethod' => $employee->payment_method,
                    'companies' => array_values(array_map(
                        fn ($id) => ['id' => $id, 'name' => $companyNames->get($id, 'Empresa eliminada')],
                        $companyIds,
                    )),
                    'weeklyHours' => $hoursByEmployee[$employee->id] ?? [],
                ];
            })->all(),
        ];
    }

    /**
     * Total hours per company across the given weeks, split by whether the employee is
     * currently active or inactive — the "Horas Reportadas > Por empresa" totals, for a
     * week/month/year period (the caller resolves which week_start values that period covers).
     *
     * @param list<string> $weekStarts
     * @return list<array{companyId: string, name: string, activeHours: float, inactiveHours: float, totalHours: float}>
     */
    public function companyHoursSummary(string $businessId, array $weekStarts): array
    {
        $companies = StaffingCompany::where('business_id', $businessId)->orderBy('name')->get();
        if ($companies->isEmpty() || $weekStarts === []) {
            return [];
        }

        $rows = DB::table('staffing_timesheet_entries as ste')
            ->join('staffing_timesheets as st', 'st.id', '=', 'ste.timesheet_id')
            ->join('profiles as p', 'p.id', '=', 'ste.employee_id')
            ->where('st.business_id', $businessId)
            ->whereIn('st.week_start', $weekStarts)
            ->selectRaw('st.company_id, p.active, SUM(ste.total_hours) as hours')
            ->groupBy('st.company_id', 'p.active')
            ->get();

        // company_id => 'activeHours'|'inactiveHours' => hours
        $byCompany = [];
        foreach ($rows as $row) {
            $key = $row->active ? 'activeHours' : 'inactiveHours';
            $byCompany[$row->company_id][$key] = (float) $row->hours;
        }

        return $companies->map(function (StaffingCompany $company) use ($byCompany) {
            $active = $byCompany[$company->id]['activeHours'] ?? 0.0;
            $inactive = $byCompany[$company->id]['inactiveHours'] ?? 0.0;

            return [
                'companyId' => $company->id,
                'name' => $company->name,
                'activeHours' => $active,
                'inactiveHours' => $inactive,
                'totalHours' => $active + $inactive,
            ];
        })->all();
    }

    /**
     * "Lista de depósitos" for a week: one row per (employee, company) ready to hand to the bank —
     * the agency used to copy this onto paper by hand off the approved nómina sheets. Scoped to
     * `payment_method = 'direct_deposit'` (a payroll-card employee has nothing to deposit) and to
     * timesheets already 'approved' or 'paid' (a draft's numbers can still change — the point of
     * this list is to guide money actually leaving the bank, not a preview). `shift` comes off the
     * employee's assignment at that company, not the timesheet entry itself — see
     * StaffingCompanyEmployee — so the frontend can fold it into the company label the way the
     * agency's own paper sheet does ("BENSON GDI NOCHE").
     *
     * @return list<array{employeeId: string, employeeName: string, titular: string, bankName: ?string, companyName: string, shift: ?string, amount: float}>
     */
    public function depositListForWeek(string $businessId, string $weekStart, ?string $companyId = null): array
    {
        $query = DB::table('staffing_timesheet_entries as ste')
            ->join('staffing_timesheets as st', 'st.id', '=', 'ste.timesheet_id')
            ->join('profiles as p', 'p.id', '=', 'ste.employee_id')
            ->join('staffing_companies as sc', 'sc.id', '=', 'st.company_id')
            ->leftJoin('staffing_company_employees as sce', function ($join) {
                $join->on('sce.company_id', '=', 'st.company_id')
                    ->on('sce.employee_id', '=', 'ste.employee_id');
            })
            ->where('st.business_id', $businessId)
            ->where('st.week_start', $weekStart)
            ->whereIn('st.status', [StaffingTimesheet::STATUS_APPROVED, StaffingTimesheet::STATUS_PAID])
            ->where('p.payment_method', 'direct_deposit')
            ->where('ste.payout', '>', 0);

        if ($companyId) {
            $query->where('st.company_id', $companyId);
        }

        // Alphabetical by the account holder (titular) — not the employee's own name — because
        // that's the name that actually shows up on the bank statement, and it's what the agency
        // scans down when reconciling deposits. Falls back to the employee's own name with the
        // same COALESCE used to build `titular` below, so someone with no separate holder on file
        // still sorts predictably by their own name instead of landing wherever NULL collates.
        $rows = $query->orderByRaw('COALESCE(p.bank_account_holder, p.full_name) asc')
            ->orderBy('sc.name')
            ->select(
                'p.id as employee_id', 'p.full_name', 'p.bank_account_holder', 'p.bank_name',
                'sc.name as company_name', 'sce.shift', 'ste.payout'
            )
            ->get();

        return $rows->map(fn ($row) => [
            'employeeId' => $row->employee_id,
            'employeeName' => $row->full_name,
            // No separate account holder on file — the deposit goes to the employee's own account.
            'titular' => $row->bank_account_holder ?: $row->full_name,
            'bankName' => $row->bank_name,
            'companyName' => $row->company_name,
            'shift' => $row->shift,
            'amount' => (float) $row->payout,
        ])->all();
    }

    /**
     * Finanzas > Resumen for the staffing niche. Ingresos = paid invoices, not billed hours: an
     * invoice only contributes once money has actually come in — 'paid' invoices count their full
     * total, 'partial' invoices count only what's been abonado so far, and 'sent' invoices (billed
     * but not yet collected) contribute nothing. Scoped by the invoice's issue_date (the week/work
     * it bills for), matching how the rest of Finanzas buckets a period. Gastos (employer_cost,
     * otherExpenses) stay on the payroll-run/week basis (staffing_timesheet_entries.week_start /
     * staffing_weekly_expenses.week_start) — this method only changes what counts as Ingresos.
     * `margin` is kept for callers still reading the billed-hours nómina margin directly (e.g. the
     * "Reportes" screens); Finanzas' own "Ganancia" is computed by the caller as ingresos - gastos,
     * not from this field — see Finanzas.vue's profitTotal.
     *
     * @return array{invoiceTotal: float, employerCost: float, otherExpenses: float, margin: float}
     */
    public function financeSummaryForPeriod(string $businessId, string $periodStart, string $periodEnd): array
    {
        $invoiceRows = DB::table('staffing_invoices as si')
            ->leftJoin('staffing_company_payments as scp', 'scp.invoice_id', '=', 'si.id')
            ->where('si.business_id', $businessId)
            ->whereIn('si.status', [StaffingInvoice::STATUS_PAID, StaffingInvoice::STATUS_PARTIAL])
            ->whereBetween('si.issue_date', [$periodStart, $periodEnd])
            ->groupBy('si.id', 'si.status', 'si.total')
            ->selectRaw('si.status, si.total, COALESCE(SUM(scp.amount), 0) as paid_amount')
            ->get();

        $invoiceTotal = (float) $invoiceRows->sum(
            fn ($row) => $row->status === StaffingInvoice::STATUS_PAID ? (float) $row->total : (float) $row->paid_amount
        );

        $row = DB::table('staffing_timesheet_entries as ste')
            ->join('staffing_timesheets as st', 'st.id', '=', 'ste.timesheet_id')
            ->where('st.business_id', $businessId)
            ->whereBetween('st.week_start', [$periodStart, $periodEnd])
            ->selectRaw('SUM(ste.employer_cost) as employer_cost, SUM(ste.margin) as margin')
            ->first();

        $otherExpenses = (float) DB::table('staffing_weekly_expenses')
            ->where('business_id', $businessId)
            ->whereBetween('week_start', [$periodStart, $periodEnd])
            ->sum('amount');

        return [
            'invoiceTotal' => $invoiceTotal,
            'employerCost' => (float) ($row->employer_cost ?? 0.0),
            'otherExpenses' => $otherExpenses,
            'margin' => (float) ($row->margin ?? 0.0),
        ];
    }

    /**
     * @return array{entities: list<array>, employees: list<array>}
     */
    public function annualTaxReport(string $businessId, int $year): array
    {
        $entities = StaffingTaxEntity::where('business_id', $businessId)
            ->orderBy('name')
            ->get();

        $entries = StaffingTaxEntry::where('business_id', $businessId)
            ->where('year', $year)
            ->get();

        $annualTaxes = StaffingAnnualTax::where('business_id', $businessId)
            ->where('year', $year)
            ->get()
            ->keyBy('employee_id');

        // The grid starts empty for a year and only ever shows employees explicitly added via
        // "Agregar información" (which upserts a StaffingAnnualTax row) or who already have at
        // least one entity amount/file saved — never every business employee by default.
        $addedEmployeeIds = $annualTaxes->keys()->merge($entries->pluck('employee_id'))->unique();

        $employees = Profile::with('staffingCompanyEmployees.company')
            ->where('business_id', $businessId)
            ->whereIn('id', $addedEmployeeIds)
            ->orderBy('full_name')
            ->get();

        // employee_id => tax_entity_id => entry
        $byEmployeeAndEntity = [];
        foreach ($entries as $entry) {
            $byEmployeeAndEntity[$entry->employee_id][$entry->tax_entity_id] = $entry;
        }

        return [
            'entities' => $entities->map(fn (StaffingTaxEntity $e) => [
                'id' => $e->id,
                'name' => $e->name,
            ])->all(),
            'employees' => $employees->map(function (Profile $employee) use ($byEmployeeAndEntity, $entities, $annualTaxes) {
                $entriesByEntity = [];
                foreach ($entities as $entity) {
                    $entry = $byEmployeeAndEntity[$employee->id][$entity->id] ?? null;
                    $entriesByEntity[$entity->id] = $entry ? [
                        'entryId' => $entry->id,
                        'amount' => (float) $entry->amount,
                        'hasFile' => (bool) $entry->file_path,
                        'fileName' => $entry->file_original_name,
                        'entryDate' => $entry->entry_date?->format('Y-m-d'),
                    ] : null;
                }

                $annualTax = $annualTaxes->get($employee->id);

                return [
                    'employeeId' => $employee->id,
                    'name' => $employee->full_name,
                    'active' => (bool) $employee->active,
                    'companyId' => $employee->staffingCompanyEmployees->first()?->company_id,
                    'companyName' => $employee->staffingCompanyEmployees->first()?->company?->name,
                    'phone' => $employee->phone,
                    'address' => $employee->address,
                    'ssnLast4' => $employee->ssn_last4,
                    'status' => $annualTax?->status ? strtoupper($annualTax->status) : 'BLANK',
                    'globalFilePath' => $annualTax?->file_path,
                    'globalFileName' => $annualTax?->file_original_name,
                    'globalFileDate' => ($annualTax?->file_date instanceof \DateTimeInterface) ? $annualTax->file_date->format('Y-m-d') : null,
                    'entriesByEntity' => $entriesByEntity,
                ];
            })->all(),
        ];
    }

    private function normalizeDate(string|DateTimeInterface $value): string
    {
        return $value instanceof DateTimeInterface ? $value->format('Y-m-d') : substr($value, 0, 10);
    }
}
