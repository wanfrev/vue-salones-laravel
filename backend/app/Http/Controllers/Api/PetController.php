<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ResolvesBusinessId;
use App\Models\Pet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PetController
{
    use ResolvesBusinessId;

    public function index(Request $request): JsonResponse
    {
        $businessId = $this->resolveBusinessId($request);
        if (!$businessId) return response()->json([]);

        $query = Pet::with('client')
            ->where('business_id', $businessId);

        if ($request->has('q') && !empty($request->q)) {
            $searchTerm = '%' . strtolower($request->q) . '%';
            $query->where(function ($q) use ($searchTerm) {
                $q->whereRaw('LOWER(name) LIKE ?', [$searchTerm])
                  ->orWhereHas('client', function ($clientQ) use ($searchTerm) {
                      $clientQ->whereRaw('LOWER(full_name) LIKE ?', [$searchTerm]);
                  });
            });
        }

        return response()->json($query->orderBy('name')->get());
    }
}
