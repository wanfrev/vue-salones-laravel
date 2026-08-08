<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Requirement;
use Illuminate\Http\Request;

class RequirementController extends Controller
{
    public function index(Request $request)
    {
        $businessId = $request->user()?->profile?->business_id;
        if (!$businessId) {
            return response()->json([]);
        }

        $query = Requirement::where('business_id', $businessId)->with('creator:id,first_name,last_name');

        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }

        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $profile = $request->user()?->profile;
        if (!$profile || !$profile->business_id) {
            return response()->json(['error' => ['message' => 'No autorizado.']], 403);
        }

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'recommended_quantity' => 'required|string|max:255',
            'recommended_brands' => 'nullable|string|max:255',
            'guide_price' => 'nullable|numeric|min:0',
            'status' => 'nullable|string|in:pending,purchased,cancelled',
        ]);

        $data['business_id'] = $profile->business_id;
        $data['created_by_profile_id'] = $profile->id;
        if (!isset($data['status'])) {
            $data['status'] = 'pending';
        }

        $requirement = Requirement::create($data);
        $requirement->load('creator:id,first_name,last_name');

        return response()->json($requirement, 201);
    }

    public function update(Request $request, string $id)
    {
        $businessId = $request->user()?->profile?->business_id;
        if (!$businessId) {
            return response()->json(['error' => ['message' => 'No autorizado.']], 403);
        }

        $requirement = Requirement::where('business_id', $businessId)->findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'recommended_quantity' => 'sometimes|required|string|max:255',
            'recommended_brands' => 'nullable|string|max:255',
            'guide_price' => 'nullable|numeric|min:0',
            'status' => 'sometimes|required|string|in:pending,purchased,cancelled',
        ]);

        $requirement->update($data);
        $requirement->load('creator:id,first_name,last_name');

        return response()->json($requirement);
    }

    public function updateStatus(Request $request, string $id)
    {
        $businessId = $request->user()?->profile?->business_id;
        if (!$businessId) {
            return response()->json(['error' => ['message' => 'No autorizado.']], 403);
        }

        $requirement = Requirement::where('business_id', $businessId)->findOrFail($id);

        $data = $request->validate([
            'status' => 'required|string|in:pending,purchased,cancelled',
        ]);

        $requirement->update(['status' => $data['status']]);

        return response()->json($requirement);
    }

    public function destroy(Request $request, string $id)
    {
        $businessId = $request->user()?->profile?->business_id;
        if (!$businessId) {
            return response()->json(['error' => ['message' => 'No autorizado.']], 403);
        }

        $requirement = Requirement::where('business_id', $businessId)->findOrFail($id);
        $requirement->delete();

        return response()->json(['message' => 'Eliminado exitosamente']);
    }
}
