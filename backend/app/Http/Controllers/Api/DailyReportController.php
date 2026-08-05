<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\DailyReport;
use App\Services\DailyReportPosSummaryService;
use Illuminate\Http\Request;
use Carbon\Carbon;

class DailyReportController extends Controller
{
    public function __construct(
        private DailyReportPosSummaryService $posSummary,
    ) {}

    /**
     * Totales cobrados en el punto de venta para una fecha, agrupados por
     * método de pago con los nombres de campo del reporte diario. Alimenta el
     * botón "Traer del POS" del formulario.
     */
    public function posSummary(Request $request)
    {
        $validated = $request->validate([
            'business_id' => 'required|string',
            'branch_id' => 'nullable|string',
            'date' => 'required|date',
        ]);

        $business = Business::find($validated['business_id']);
        $features = $business?->features ?? [];
        $features = is_array($features) ? $features : (json_decode((string) $features, true) ?: []);

        if (!($features['daily_report_autofill_from_pos'] ?? false)) {
            return response()->json([
                'error' => ['message' => 'El llenado automático desde el punto de venta está desactivado.'],
            ], 403);
        }

        return response()->json($this->posSummary->summarize(
            $validated['business_id'],
            $validated['date'],
            $validated['branch_id'] ?? null,
        ));
    }

    public function index(Request $request)
    {
        $request->validate([
            'business_id' => 'required|string',
            'branch_id' => 'nullable|string',
            'month' => 'nullable|date_format:Y-m',
        ]);

        $query = DailyReport::where('business_id', $request->business_id);

        if ($request->filled('branch_id')) {
            $query->where(function ($q) use ($request) {
                $q->where('branch_id', $request->branch_id)
                  ->orWhereNull('branch_id');
            });
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
            'card_usd' => 'nullable|numeric|min:0',
            'gift_card_usd' => 'nullable|numeric|min:0',
            'other_usd' => 'nullable|numeric|min:0',
            'other_bs' => 'nullable|numeric|min:0',
            'credit_bs' => 'nullable|numeric|min:0',
            'credit_usd' => 'nullable|numeric|min:0',
            'credits_detail' => 'nullable|array',
            'total_bs' => 'nullable|numeric|min:0',
            'total_usd' => 'nullable|numeric|min:0',
        ]);

        unset($validated['id']);
        $validated['branch_id'] = !empty($validated['branch_id']) ? $validated['branch_id'] : null;
        $validated['user_id'] = $request->user()?->id;

        // Auto-calculate totals
        $validated['total_bs'] = ($validated['pos_bs'] ?? 0) + ($validated['pago_movil_bs'] ?? 0) + ($validated['cash_bs'] ?? 0) + ($validated['transfer_bs'] ?? 0) + ($validated['other_bs'] ?? 0) + ($validated['credit_bs'] ?? 0);
        $validated['total_usd'] = ($validated['cash_usd'] ?? 0) + ($validated['zelle_usd'] ?? 0) + ($validated['binance_usd'] ?? 0) + ($validated['cashea_usd'] ?? 0) + ($validated['card_usd'] ?? 0) + ($validated['gift_card_usd'] ?? 0) + ($validated['other_usd'] ?? 0) + ($validated['credit_usd'] ?? 0);

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
            'card_usd' => 'nullable|numeric|min:0',
            'gift_card_usd' => 'nullable|numeric|min:0',
            'other_usd' => 'nullable|numeric|min:0',
            'other_bs' => 'nullable|numeric|min:0',
            'credit_bs' => 'nullable|numeric|min:0',
            'credit_usd' => 'nullable|numeric|min:0',
            'credits_detail' => 'nullable|array',
            'total_bs' => 'nullable|numeric|min:0',
            'total_usd' => 'nullable|numeric|min:0',
        ]);

        unset($validated['id']);

        // Auto-calculate totals
        $validated['total_bs'] = ($validated['pos_bs'] ?? 0) + ($validated['pago_movil_bs'] ?? 0) + ($validated['cash_bs'] ?? 0) + ($validated['transfer_bs'] ?? 0) + ($validated['other_bs'] ?? 0) + ($validated['credit_bs'] ?? 0);
        $validated['total_usd'] = ($validated['cash_usd'] ?? 0) + ($validated['zelle_usd'] ?? 0) + ($validated['binance_usd'] ?? 0) + ($validated['cashea_usd'] ?? 0) + ($validated['card_usd'] ?? 0) + ($validated['gift_card_usd'] ?? 0) + ($validated['other_usd'] ?? 0) + ($validated['credit_usd'] ?? 0);

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
