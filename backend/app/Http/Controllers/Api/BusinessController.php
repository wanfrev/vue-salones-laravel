<?php

namespace App\Http\Controllers\Api;

use App\Http\Resources\BusinessResource;
use App\Models\Business;
use Illuminate\Http\JsonResponse;

class BusinessController
{
    /**
     * GET /api/businesses/{id}
     */
    public function show(string $id): JsonResponse
    {
        $business = Business::find($id);

        if (!$business) {
            return response()->json(['error' => ['message' => 'Not found']], 404);
        }

        return response()->json(new BusinessResource($business));
    }
}
