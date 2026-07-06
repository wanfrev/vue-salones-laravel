<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\CreateBusinessRequest;
use App\Http\Resources\BusinessResource;
use App\Models\Branch;
use App\Models\Business;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SuperadminController
{
    /**
     * GET /api/admin/businesses
     * Lista todos los negocios (solo superadmin).
     */
    public function businesses(): JsonResponse
    {
        $businesses = Business::whereNull('deleted_at')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(BusinessResource::collection($businesses));
    }

    /**
     * POST /api/admin/businesses
     * Crea negocio + admin user + profile + branch default.
     */
    public function store(CreateBusinessRequest $request): JsonResponse
    {
        $data = $request->validated();
        $email = strtolower(trim($data['ownerEmail']));

        // Pre-check: email ya existe?
        if (User::where('email', $email)->exists()) {
            return response()->json([
                'error' => ['message' => 'Ya existe un usuario registrado con este correo electrónico.'],
            ], 422);
        }

        $businessId = Str::uuid()->toString();
        $userId = Str::uuid()->toString();
        $branchId = Str::uuid()->toString();
        $slug = Str::slug($data['name']);

        DB::beginTransaction();
        try {
            // 1. Crear negocio
            Business::create([
                'id' => $businessId,
                'name' => $data['name'],
                'slug' => $slug,
                'niche_type' => $data['nicheType'] ?? 'salon',
                'timezone' => 'America/Santo_Domingo',
                'currency' => 'USD',
                'ves_exchange_rate' => 36.5,
                'features' => json_encode([
                    'pos' => true, 'inventario' => true,
                    'productos' => true, 'proveedores' => true,
                    'multi_branch' => false,
                ]),
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // 2. Crear usuario admin
            User::create([
                'id' => $userId,
                'name' => $data['name'] . ' Admin',
                'email' => $email,
                'password' => bcrypt($data['ownerPassword']),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // 3. Crear perfil admin
            Profile::create([
                'id' => $userId,
                'business_id' => $businessId,
                'full_name' => $data['name'] . ' Admin',
                'role' => 'admin',
                'email' => $email,
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // 4. Crear sucursal default
            Branch::create([
                'id' => $branchId,
                'business_id' => $businessId,
                'name' => 'Principal',
                'is_default' => true,
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error' => ['message' => 'No fue posible crear el negocio.', 'details' => $e->getMessage()],
            ], 500);
        }

        $business = Business::find($businessId);

        return response()->json([
            'business' => new BusinessResource($business),
            'invitedUserId' => $userId,
        ], 201);
    }

    /**
     * PUT /api/admin/businesses/{id}
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $business = Business::find($id);
        if (!$business) {
            return response()->json(['error' => ['message' => 'Not found']], 404);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:500'],
            'timezone' => ['sometimes', 'string'],
            'currency' => ['sometimes', 'string'],
            'niche_type' => ['sometimes', 'string'],
            'active' => ['sometimes', 'boolean'],
            'ves_exchange_rate' => ['nullable', 'numeric', 'min:0'],
            'multi_branch_enabled' => ['sometimes', 'boolean'],
            'features' => ['nullable', 'array'],
        ]);

        $business->update($validated + ['updated_at' => now()]);

        return response()->json(new BusinessResource($business->fresh()));
    }

    /**
     * DELETE /api/admin/businesses/{id}
     * Soft delete: marca deleted_at.
     */
    public function destroy(string $id): JsonResponse
    {
        $business = Business::find($id);
        if (!$business) {
            return response()->json(['error' => ['message' => 'Not found']], 404);
        }

        $business->update([
            'deleted_at' => now(),
            'active' => false,
            'updated_at' => now(),
        ]);

        Profile::where('business_id', $id)->update([
            'active' => false,
            'updated_at' => now(),
        ]);

        return response()->json(null, 204);
    }

    /**
     * POST /api/admin/businesses/{id}/suspend
     */
    public function suspend(string $id): JsonResponse
    {
        $business = Business::find($id);
        if (!$business) {
            return response()->json(['error' => ['message' => 'Not found']], 404);
        }

        $business->update(['active' => false, 'updated_at' => now()]);
        Profile::where('business_id', $id)
            ->where('role', '!=', 'superadmin')
            ->update(['active' => false, 'updated_at' => now()]);

        return response()->json(['success' => true]);
    }

    /**
     * POST /api/admin/businesses/{id}/resume
     */
    public function resume(string $id): JsonResponse
    {
        $business = Business::find($id);
        if (!$business) {
            return response()->json(['error' => ['message' => 'Not found']], 404);
        }

        $business->update(['active' => true, 'updated_at' => now()]);
        Profile::where('business_id', $id)
            ->where('role', '!=', 'superadmin')
            ->update(['active' => true, 'updated_at' => now()]);

        return response()->json(['success' => true]);
    }

    /**
     * GET /api/admin/businesses/{id}/admins
     */
    public function admins(string $id): JsonResponse
    {
        $admins = Profile::where('business_id', $id)
            ->where('role', 'admin')
            ->select('id', 'business_id', 'full_name', 'role', 'phone', 'avatar_url')
            ->orderBy('full_name')
            ->get();

        return response()->json($admins);
    }
}
