<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DailyReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DailyReportController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'business_id' => 'required|uuid',
            'branch_id' => 'nullable|uuid',
            'month' => 'nullable|date_format:Y-m', // e.g. "2026-07"
        ]);

        $query = DailyReport::where('business_id', $request->business_id);

        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        } else {
            $query->whereNull('branch_id');
        }

        if ($request->has('month')) {
            $month = Carbon::createFromFormat('Y-m', $request->month);
            $query->whereYear('date', $month->year)
                  ->whereMonth('date', $month->month);
        }

        $reports = $query->with('user:id,name')->orderBy('date', 'desc')->get();

        return response()->json($reports);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'business_id' => 'required|uuid',
            'branch_id' => 'nullable|uuid',
            'date' => 'required|date',
            'exchange_rate' => 'numeric|min:0',
            'z_report_bs' => 'numeric|min:0',
            'z_report_usd' => 'numeric|min:0',
            'pos_bs' => 'numeric|min:0',
            'pago_movil_bs' => 'numeric|min:0',
            'cash_bs' => 'numeric|min:0',
            'transfer_bs' => 'numeric|min:0',
            'cash_usd' => 'numeric|min:0',
            'zelle_usd' => 'numeric|min:0',
            'binance_usd' => 'numeric|min:0',
            'cashea_usd' => 'numeric|min:0',
            'total_bs' => 'numeric|min:0',
            'total_usd' => 'numeric|min:0',
        ]);

        $validated['user_id'] = $request->user()->id;

        $report = DailyReport::create($validated);

        return response()->json($report, 201);
    }

    public function update(Request $request, $id)
    {
        $report = DailyReport::findOrFail($id);

        $validated = $request->validate([
            'date' => 'required|date',
            'exchange_rate' => 'numeric|min:0',
            'z_report_bs' => 'numeric|min:0',
            'z_report_usd' => 'numeric|min:0',
            'pos_bs' => 'numeric|min:0',
            'pago_movil_bs' => 'numeric|min:0',
            'cash_bs' => 'numeric|min:0',
            'transfer_bs' => 'numeric|min:0',
            'cash_usd' => 'numeric|min:0',
            'zelle_usd' => 'numeric|min:0',
            'binance_usd' => 'numeric|min:0',
            'cashea_usd' => 'numeric|min:0',
            'total_bs' => 'numeric|min:0',
            'total_usd' => 'numeric|min:0',
        ]);

        $report->update($validated);

        return response()->json($report);
    }

    public function destroy($id)
    {
        $report = DailyReport::findOrFail($id);
        $report->delete();

        return response()->json(['message' => 'Report deleted']);
    }
}
