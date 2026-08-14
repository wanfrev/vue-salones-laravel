<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Services\Staffing\StaffingTaxEntityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StaffingTaxEntityController
{
    public function __construct(
        private StaffingTaxEntityService $entities,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        return response()->json($this->entities->list($p->business_id));
    }

    public function store(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validate([
            'name' => 'required|string|max:120',
            'active' => 'boolean',
        ]);

        $entity = $this->entities->store($data, $p->business_id);
        EntityChanged::safe($p->business_id, 'staffing_tax_entity', 'created', $entity->id);

        return response()->json($entity, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;

        $data = $request->validate([
            'name' => 'sometimes|string|max:120',
            'active' => 'boolean',
        ]);

        $entity = $this->entities->update($id, $data, $p?->business_id ?? '');
        EntityChanged::safe($p?->business_id, 'staffing_tax_entity', 'updated', $id);

        return response()->json($entity);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;

        $this->entities->destroy($id, $p?->business_id ?? '');
        EntityChanged::safe($p?->business_id, 'staffing_tax_entity', 'deleted', $id);

        return response()->json(null, 204);
    }
}
