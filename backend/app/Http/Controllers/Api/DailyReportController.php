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
            'business_id' => 'required|string',
            'branch_id' => 'nullable|string',
            'month' => 'nullable|date_format:Y-m',
        ]);

        $query = DailyReport::where('business_id', $request->business_id);

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->filled('month')) {
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
            'business_id' => 'required|string',
            'branch_id' => 'nullable|string',
            'date' => 'required|date',
            'exchange_rate' => 'nullable|numeric|min:0',
            'z_report_bs' => 'nullable|numeric|min:0',
            'z_report_usd' => 'nullable|numeric|min:0',
            'pos_bs' => 'nullable|numeric|min:0',
            'pago_movil_bs' => 'nullable|numeric|min:0',
            'cash_bs' => 'nullable|numeric|min:0',
            'transfer_bs' => 'nullable|numeric|min:0',
            'cash_usd' => 'nullable|numeric|min:0',
            'zelle_usd' => 'nullable|numeric|min:0',
            'binance_usd' => 'nullable|numeric|min:0',
            'cashea_usd' => 'nullable|numeric|min:0',
            'total_bs' => 'nullable|numeric|min:0',
            'total_usd' => 'nullable|numeric|min:0',
        ]);

        $validated['branch_id'] = !empty($validated['branch_id']) ? $validated['branch_id'] : null;
        $validated['user_id'] = $request->user()?->id;

        // Auto-calculate totals
        $validated['total_bs'] = ($validated['pos_bs'] ?? 0) + ($validated['pago_movil_bs'] ?? 0) + ($validated['cash_bs'] ?? 0) + ($validated['transfer_bs'] ?? 0);
        $validated['total_usd'] = ($validated['cash_usd'] ?? 0) + ($validated['zelle_usd'] ?? 0) + ($validated['binance_usd'] ?? 0) + ($validated['cashea_usd'] ?? 0);

        $report = DailyReport::create($validated);

        return response()->json($report, 201);
    }

    public function update(Request $request, $id)
    {
        $report = DailyReport::findOrFail($id);

        $validated = $request->validate([
            'date' => 'required|date',
            'exchange_rate' => 'nullable|numeric|min:0',
            'z_report_bs' => 'nullable|numeric|min:0',
            'z_report_usd' => 'nullable|numeric|min:0',
            'pos_bs' => 'nullable|numeric|min:0',
            'pago_movil_bs' => 'nullable|numeric|min:0',
            'cash_bs' => 'nullable|numeric|min:0',
            'transfer_bs' => 'nullable|numeric|min:0',
            'cash_usd' => 'nullable|numeric|min:0',
            'zelle_usd' => 'nullable|numeric|min:0',
            'binance_usd' => 'nullable|numeric|min:0',
            'cashea_usd' => 'nullable|numeric|min:0',
            'total_bs' => 'nullable|numeric|min:0',
            'total_usd' => 'nullable|numeric|min:0',
        ]);

        // Auto-calculate totals
        $validated['total_bs'] = ($validated['pos_bs'] ?? 0) + ($validated['pago_movil_bs'] ?? 0) + ($validated['cash_bs'] ?? 0) + ($validated['transfer_bs'] ?? 0);
        $validated['total_usd'] = ($validated['cash_usd'] ?? 0) + ($validated['zelle_usd'] ?? 0) + ($validated['binance_usd'] ?? 0) + ($validated['cashea_usd'] ?? 0);

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
