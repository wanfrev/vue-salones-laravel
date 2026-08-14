<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Models\Lead;
use App\Services\Staffing\LeadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadController
{
    public function __construct(
        private LeadService $leads,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        $isAdmin = in_array($p->role, ['admin', 'superadmin', 'encargado'], true);

        return response()->json(
            $this->leads->list($p->business_id, $p->id, $isAdmin)
        );
    }

    /**
     * The sidebar roster for the admin CRM view — every vendedora with her lead count.
     * Admin-only, same in-controller check as everywhere else in this class (no `admin-panel`
     * middleware on the route group, since a plain vendedora reaching this legitimately gets []).
     */
    public function vendedoras(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        $isAdmin = in_array($p->role, ['admin', 'superadmin', 'encargado'], true);
        if (!$isAdmin) {
            return response()->json([]);
        }

        return response()->json($this->leads->vendedoraRoster($p->business_id));
    }

    public function store(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validate($this->rules());

        $lead = $this->leads->store($data, $p->business_id, $p->id);
        EntityChanged::safe($p->business_id, 'lead', 'created', $lead->id);

        return response()->json($lead, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $isAdmin = in_array($p->role, ['admin', 'superadmin', 'encargado'], true);
        $data = $request->validate($this->rules(forUpdate: true));

        $lead = $this->leads->update($id, $data, $p->business_id, $p->id, $isAdmin);
        EntityChanged::safe($p->business_id, 'lead', 'updated', $id);

        return response()->json($lead);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $isAdmin = in_array($p->role, ['admin', 'superadmin', 'encargado'], true);

        $this->leads->destroy($id, $p->business_id, $p->id, $isAdmin);
        EntityChanged::safe($p->business_id, 'lead', 'deleted', $id);

        return response()->json(null, 204);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(bool $forUpdate = false): array
    {
        return [
            'company_name' => ($forUpdate ? 'sometimes' : 'required') . '|string|max:255',
            'work_area' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'status' => 'nullable|in:' . implode(',', Lead::STATUSES),
            'visit_date' => 'nullable|date',
            'company_category' => 'nullable|string|max:120',
            'priority' => 'nullable|in:' . implode(',', Lead::PRIORITIES),
            'contact_card' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:120',
            'notes' => 'nullable|string',
        ];
    }
}
