<?php

namespace App\Http\Controllers\Api\Staffing;

use App\Services\Staffing\StaffingProjectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class StaffingProjectController
{
    public function __construct(
        private StaffingProjectService $projects,
    ) {}

    public function index(Request $request, string $companyId): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        return response()->json(
            $this->projects->listForCompany($p->business_id, $companyId)
        );
    }

    public function allForBusiness(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        return response()->json(
            $this->projects->allForBusiness($p->business_id)
        );
    }

    public function store(Request $request, string $companyId): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'active' => 'boolean',
        ]);

        try {
            $project = $this->projects->create($p->business_id, $companyId, $data);
            return response()->json($project, 201);
        } catch (RuntimeException $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 422);
        }
    }

    public function update(Request $request, string $companyId, string $id): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validate([
            'name' => 'string|max:255',
            'active' => 'boolean',
        ]);

        try {
            $project = $this->projects->update($p->business_id, $companyId, $id, $data);
            return response()->json($project);
        } catch (RuntimeException $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 422);
        }
    }

    public function destroy(Request $request, string $companyId, string $id): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        try {
            $this->projects->delete($p->business_id, $companyId, $id);
            return response()->json(null, 204);
        } catch (\Illuminate\Database\QueryException $e) {
            if ($e->getCode() === '23503') {
                return response()->json(['error' => ['message' => 'No se puede eliminar el proyecto porque tiene horas o facturas asociadas.']], 409);
            }
            throw $e;
        }
    }
}
