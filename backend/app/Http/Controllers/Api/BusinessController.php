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
        $profile = $user?->profile;
        $profileBusinessId = $profile?->business_id;

        // Only business managers may edit their own business settings here.
        // (Plain empleado/cajero profiles have no legitimate reason to hit this endpoint —
        // previously anyone authenticated could self-grant every feature flag on their tenant.)
        if (!in_array($profile?->role, ['admin', 'superadmin', 'encargado'], true)) {
            abort(403, 'No tienes permiso para modificar este negocio.');
        }

        $data = $request->validate([
            'employee_ves_rate' => ['nullable', 'numeric', 'min:0'],
            'ves_exchange_rate' => ['nullable', 'numeric', 'min:0'],
            'job_titles' => ['nullable', 'array'],
            'service_categories' => ['nullable', 'array'],
            'terminology' => ['nullable', 'array'],
            'theme_config' => ['nullable', 'array'],
            'features' => ['nullable', 'array'],
        ]);

        // 'features' here is the tenant's own operational-toggle set (Configuracion.vue),
        // e.g. encargados_change_exchange_rate, pos_direct_service_sale. Core module flags
        // (pos, inventario, productos, proveedores, gift_cards, ...) are superadmin-controlled
        // via PUT /admin/businesses/{id} and are not restricted further here — an admin/encargado
        // toggling their own tenant's flags is expected, legitimate behaviour, not the hole
        // being closed (that hole was the total absence of a role check on this endpoint).

        $business = $this->businessService->update($id, $data, $profileBusinessId);
        $this->dispatchChange($profileBusinessId, 'business', 'updated', $id);
        return response()->json(new BusinessResource($business));
    }
}
