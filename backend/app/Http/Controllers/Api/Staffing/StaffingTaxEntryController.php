<?php

namespace App\Http\Controllers\Api\Staffing;

use App\Events\EntityChanged;
use App\Services\Staffing\StaffingTaxEntryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StaffingTaxEntryController
{
    public function __construct(
        private StaffingTaxEntryService $entries,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        $year = $request->has('year') ? (int) $request->input('year') : null;

        return response()->json($this->entries->list($p->business_id, $year));
    }

    /**
     * Upsert by (employee_id, tax_entity_id, year) — same one-endpoint-does-both shape as
     * StaffingRateService::store(). The first multipart request in this codebase: `file` arrives
     * as part of the multipart body alongside the other fields, not as JSON.
     */
    public function store(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validate([
            'employee_id' => 'required|uuid',
            'tax_entity_id' => 'required|uuid',
            'year' => 'required|integer|min:2000|max:2100',
            'amount' => 'nullable|numeric|min:0',
            'entry_date' => 'nullable|date',
            'file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        $entry = $this->entries->upsert($data, $p->business_id, $request->file('file'), $p->id);
        EntityChanged::safe($p->business_id, 'staffing_tax_entry', 'updated', $entry->id);

        return response()->json($entry, 201);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;

        $this->entries->destroy($id, $p?->business_id ?? '');
        EntityChanged::safe($p?->business_id, 'staffing_tax_entry', 'deleted', $id);

        return response()->json(null, 204);
    }

    /** Removes the attached file only — the amount/date on this cell stay untouched. */
    public function destroyFile(Request $request, string $id): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $entry = $this->entries->deleteFile($id, $p->business_id);
        EntityChanged::safe($p->business_id, 'staffing_tax_entry', 'updated', $entry->id);

        return response()->json($entry);
    }

    /**
     * The only way to read one of these documents. Never served from a public disk/URL — this
     * route is gated by the same capability+admin-panel middleware as the rest of Taxes, and
     * double-checks the entry actually belongs to the caller's business before streaming it.
     */
    public function download(Request $request, string $id): StreamedResponse|JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $entry = $this->entries->findForBusiness($id, $p->business_id);
        if (!$entry->file_path || !Storage::disk('local')->exists($entry->file_path)) {
            return response()->json(['error' => ['message' => 'Sin archivo adjunto.']], 404);
        }

        return Storage::disk('local')->download($entry->file_path, $entry->file_original_name ?? 'documento');
    }
}
