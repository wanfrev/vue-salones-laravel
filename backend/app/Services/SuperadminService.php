<?php

namespace App\Services;

use App\Models\Business;
use App\Models\Profile;
use App\Models\SuperadminAuditLog;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class SuperadminService
{
    public function businesses(): Collection
    {
        return Business::whereNull('deleted_at')
            ->orderByDesc('created_at')
            ->get();
    }

    public function store(array $data): array
    {
        $email = strtolower(trim($data['ownerEmail']));

        if (User::where('email', $email)->exists()) {
            throw new HttpException(422, 'Ya existe un usuario registrado con este correo electrónico.');
        }

    $businessId = Str::uuid()->toString();
    $userId = Str::uuid()->toString();
    $slug = Str::slug($data['name']);

        DB::beginTransaction();
        try {
            Business::create([
                'id' => $businessId,
                'name' => $data['name'],
                'slug' => $slug,
                'niche_type' => $data['nicheType'] ?? 'salon',
                'timezone' => 'America/Santo_Domingo',
                'currency' => 'USD',
                'ves_exchange_rate' => 36.5,
                'features' => [
                    'pos' => true, 'inventario' => true,
                    'productos' => true, 'proveedores' => true,
                'multi_branch' => false,
            ],
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            User::create([
                'id' => $userId,
                'name' => $data['name'] . ' Admin',
                'email' => $email,
                'password' => $data['ownerPassword'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);

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

        DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw new HttpException(500, 'No fue posible crear el negocio: ' . $e->getMessage());
        }

        return [
            'businessId' => $businessId,
            'userId' => $userId,
        ];
    }

    public function update(string $id, array $data): Business
    {
        $business = Business::find($id);
        if (!$business) {
            throw new NotFoundHttpException('Negocio no encontrado.');
        }

        $business->update($data + ['updated_at' => now()]);
        return $business->fresh();
    }

    public function destroy(string $id): void
    {
        $business = Business::find($id);
        if (!$business) {
            throw new NotFoundHttpException('Negocio no encontrado.');
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
    }

    public function suspend(string $id): void
    {
        $business = Business::find($id);
        if (!$business) {
            throw new NotFoundHttpException('Negocio no encontrado.');
        }

        $business->update(['active' => false, 'updated_at' => now()]);
        Profile::where('business_id', $id)
            ->where('role', '!=', 'superadmin')
            ->update(['active' => false, 'updated_at' => now()]);
    }

    public function resume(string $id): void
    {
        $business = Business::find($id);
        if (!$business) {
            throw new NotFoundHttpException('Negocio no encontrado.');
        }

        $business->update(['active' => true, 'updated_at' => now()]);
        Profile::where('business_id', $id)
            ->where('role', '!=', 'superadmin')
            ->update(['active' => true, 'updated_at' => now()]);
    }

    public function admins(string $businessId): Collection
    {
        // 'email' is required by the UI to tell two admins apart — especially before a
        // password reset, where picking the wrong row changes the wrong person's credentials.
        return Profile::where('business_id', $businessId)
            ->where('role', 'admin')
            ->select('id', 'business_id', 'full_name', 'email', 'role', 'phone', 'avatar_url')
            ->orderBy('full_name')
            ->get();
    }

    /**
     * Set a new password for a business admin.
     *
     * Scoped deliberately to role='admin' within the given business: the superadmin route
     * prefix already restricts who can call this, but pinning the target to the business's
     * own admins keeps a mistyped/tampered profile id from reaching an unrelated account
     * (another business's owner, or a superadmin).
     *
     * The password is hashed on write by User's 'password' => 'hashed' cast — it is stored
     * one-way and cannot be read back, by this app or anyone else.
     */
    public function resetAdminPassword(string $businessId, string $profileId, string $newPassword, string $actorId): Profile
    {
        $profile = Profile::where('id', $profileId)
            ->where('business_id', $businessId)
            ->where('role', 'admin')
            ->first();

        if (!$profile) {
            throw new NotFoundHttpException('Administrador no encontrado en este negocio.');
        }

        $user = User::find($profileId);
        if (!$user) {
            throw new NotFoundHttpException('El usuario asociado a este administrador no existe.');
        }

        $user->password = $newPassword;
        $user->save();

        // Existing sessions keep working on a password change unless the tokens are dropped.
        // For a superadmin-initiated reset the intent is almost always to cut off access
        // (lost device, staff change), so revoke them and force a fresh login.
        $user->tokens()->delete();

        $profile->update(['updated_at' => now()]);

        $this->logAudit($actorId, 'reset_admin_password', $businessId, $profileId, [
            'admin_name' => $profile->full_name,
            'admin_email' => $profile->email,
        ]);

        return $profile;
    }

    /**
     * Issue a short-lived Sanctum token for a business admin so the superadmin can debug
     * as them without touching their password or their own active sessions.
     *
     * The token is separate from the target's own tokens (createToken() only adds a row;
     * it never invalidates existing ones), so this is non-destructive by construction —
     * unlike resetAdminPassword, the admin's own login keeps working throughout.
     *
     * Scoped to role='admin' + active, same reasoning as resetAdminPassword: only a real,
     * currently-usable admin account of THIS business can be impersonated.
     */
    public function impersonate(string $businessId, string $profileId, string $actorId): array
    {
        $profile = Profile::where('id', $profileId)
            ->where('business_id', $businessId)
            ->where('role', 'admin')
            ->first();

        if (!$profile) {
            throw new NotFoundHttpException('Administrador no encontrado en este negocio.');
        }
        if (!$profile->active) {
            throw new HttpException(403, 'Este administrador está inactivo.');
        }

        $user = User::with('profile')->find($profileId);
        if (!$user) {
            throw new NotFoundHttpException('El usuario asociado a este administrador no existe.');
        }

        $expiresAt = now()->addHours(2);
        $token = $user->createToken("impersonation:by:{$actorId}", ['*'], $expiresAt)->plainTextToken;
        $business = Business::find($businessId);

        $this->logAudit($actorId, 'impersonate_admin', $businessId, $profileId, [
            'admin_name' => $profile->full_name,
            'admin_email' => $profile->email,
            'business_name' => $business?->name,
        ]);

        return [
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
            'business' => $business,
            'expires_at' => $expiresAt->toIso8601String(),
        ];
    }

    /** Most recent superadmin actions, optionally scoped to one business. */
    public function auditLogs(?string $businessId = null, int $limit = 50): Collection
    {
        $query = SuperadminAuditLog::query()->orderByDesc('created_at')->limit($limit);
        if ($businessId) {
            $query->where('business_id', $businessId);
        }
        return $query->get();
    }

    private function logAudit(string $actorId, string $action, ?string $businessId, ?string $targetProfileId, array $metadata = []): void
    {
        SuperadminAuditLog::create([
            'id' => Str::uuid()->toString(),
            'actor_id' => $actorId,
            'action' => $action,
            'business_id' => $businessId,
            'target_profile_id' => $targetProfileId,
            'metadata' => $metadata,
        ]);
    }
}
