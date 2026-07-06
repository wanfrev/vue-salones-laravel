<?php

namespace App\Http\Controllers\Api;

use App\Http\Resources\BusinessResource;
use App\Models\Business;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BusinessController
{
    public function show(string $id): JsonResponse
    {
        $business = Business::find($id);
        if (!$business) {
            return response()->json(['error' => ['message' => 'Not found']], 404);
        }
        return response()->json(new BusinessResource($business));
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $business = Business::find($id);

        if (!$business || $business->id !== $user?->profile?->business_id) {
            return response()->json(['error' => ['message' => 'Not found']], 404);
        }

        $data = $request->validate([
            'employee_ves_rate' => ['nullable', 'numeric', 'min:0'],
            'ves_exchange_rate' => ['nullable', 'numeric', 'min:0'],
            'job_titles' => ['nullable', 'array'],
            'service_categories' => ['nullable', 'array'],
            'terminology' => ['nullable', 'array'],
            'theme_config' => ['nullable', 'array'],
        ]);

        $business->update($data + ['updated_at' => now()]);

        return response()->json(new BusinessResource($business->fresh()));
    }
}
