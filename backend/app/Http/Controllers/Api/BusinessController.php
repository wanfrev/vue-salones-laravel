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

    private function dispatchChange(?string $businessId, string $entity, string $action, ?string $entityId = null): void
    {
        if (!$businessId) return;
        try {
            EntityChanged::dispatch($businessId, $entity, $action, $entityId);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("EntityChanged dispatch failed: {$e->getMessage()}");
        }
    }

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
            'features' => ['nullable', 'array'],
        ]);

        $business = $this->businessService->update($id, $data, $profileBusinessId);
        $this->dispatchChange($profileBusinessId, 'business', 'updated', $id);
        return response()->json(new BusinessResource($business));
    }
}
