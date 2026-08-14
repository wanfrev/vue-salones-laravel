<?php

namespace App\Services\Staffing;

use App\Models\StaffingCompany;
use DateTimeImmutable;
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
            $weekStart = $row->week_start instanceof \DateTimeInterface
                ? $row->week_start->format('Y-m-d')
                : substr((string) $row->week_start, 0, 10);
            $byCompany[$row->company_id][$weekStart] = (int) $row->headcount;
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
}
