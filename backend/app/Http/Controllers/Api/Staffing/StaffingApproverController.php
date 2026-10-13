<?php

namespace App\Http\Controllers\Api\Staffing;

use App\Services\Staffing\StaffingApproverService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use RuntimeException;

/**
 * Approvers (firmantes) for the opt-in payroll approval stamp — see StaffingApproverService for why
 * they exist. The PIN hash is never serialized; changing or removing one always needs its PIN.
 */
class StaffingApproverController
{
    private const PIN_RULE = ['required', 'string', 'regex:/^\d{4,8}$/'];

    public function __construct(private StaffingApproverService $approvers) {}

    public function index(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        return response()->json(
            $this->approvers->list($p->business_id)->map(fn ($a) => ['id' => $a->id, 'name' => $a->name, 'image' => $a->image])->values()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validate([
            'name' => 'required|string|min:2|max:80',
            'pin' => self::PIN_RULE,
            'image' => 'nullable|string',
        ]);

        try {
            $approver = $this->approvers->create($p->business_id, $data['name'], $data['pin'], $data['image'] ?? null);
        } catch (RuntimeException|InvalidArgumentException $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 422);
        }

        return response()->json(['id' => $approver->id, 'name' => $approver->name, 'image' => $approver->image], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validate([
            'pin' => self::PIN_RULE,
            'name' => 'sometimes|string|min:2|max:80',
            'image' => 'sometimes|nullable|string',
            'new_pin' => ['sometimes', 'string', 'regex:/^\d{4,8}$/'],
        ]);

        try {
            $approver = $this->approvers->update($id, $p->business_id, $data['pin'], collect($data)->except('pin')->all());
        } catch (RuntimeException|InvalidArgumentException $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 422);
        }

        return response()->json(['id' => $approver->id, 'name' => $approver->name, 'image' => $approver->image]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validate(['pin' => self::PIN_RULE]);

        try {
            $this->approvers->delete($id, $p->business_id, $data['pin']);
        } catch (RuntimeException $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 422);
        }

        return response()->json(null, 204);
    }
}
