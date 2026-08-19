<?php

namespace App\Http\Controllers\Api\Staffing;

use App\Events\EntityChanged;
use App\Services\Staffing\EmployeeAssetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeAssetController
{
    public function __construct(
        private EmployeeAssetService $assets,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json([]);
        }

        $data = $request->validate([
            'employee_id' => 'required|uuid',
        ]);

        return response()->json(
            $this->assets->forEmployee($p->business_id, $data['employee_id'])
        );
    }

    public function store(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validate([
            'employee_id' => 'required|uuid',
            'asset_type' => 'required|string|in:vehiculo,telefono,laptop,otro',
            'description' => 'required|string|max:255',
        ]);

        $asset = $this->assets->store($data, $p->business_id);
        EntityChanged::safe($p->business_id, 'employee_asset', 'created', $asset->id);

        return response()->json($asset, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $data = $request->validate([
            'asset_type' => 'required|string|in:vehiculo,telefono,laptop,otro',
            'description' => 'required|string|max:255',
        ]);

        $asset = $this->assets->update($id, $data, $p->business_id);
        EntityChanged::safe($p->business_id, 'employee_asset', 'updated', $asset->id);

        return response()->json($asset);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }

        $this->assets->destroy($id, $p->business_id);
        EntityChanged::safe($p->business_id, 'employee_asset', 'deleted', $id);

        return response()->json(null, 204);
    }
}
