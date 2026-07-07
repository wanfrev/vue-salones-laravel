<?php

namespace App\Http\Controllers\Api;

use App\Events\EntityChanged;
use App\Http\Resources\BusinessResource;
use App\Services\BusinessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BusinessController
{
    public function __construct(
        private BusinessService $businessService,
    ) {}

    public function show(string $id): JsonResponse
    {
        $business = $this->businessService->show($id);
        return response()->json(new BusinessResource($business));
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user()?->load('profile');
        $profileBusinessId = $user?->profile?->business_id;

        $data = $request->validate([
            'employee_ves_rate' => ['nullable', 'numeric', 'min:0'],
            'ves_exchange_rate' => ['nullable', 'numeric', 'min:0'],
            'job_titles' => ['nullable', 'array'],
            'service_categories' => ['nullable', 'array'],
            'terminology' => ['nullable', 'array'],
            'theme_config' => ['nullable', 'array'],
        ]);

        $business = $this->businessService->update($id, $data, $profileBusinessId);
        EntityChanged::dispatch($profileBusinessId, 'business', 'updated', $id);
        return response()->json(new BusinessResource($business));
    }
}
