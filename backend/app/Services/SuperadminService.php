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

    public function listSuperadmins(): Collection
    {
        return Profile::where('role', 'superadmin')
            ->select('id', 'full_name', 'email', 'active', 'created_at')
            ->orderBy('full_name')
            ->get();
    }

    public function createSuperadmin(array $data, string $actorId): Profile
    {
        $email = strtolower(trim($data['email']));

        if (User::where('email', $email)->exists()) {
            throw new HttpException(422, 'Ya existe un usuario registrado con este correo electrónico.');
        }

        $userId = Str::uuid()->toString();

        DB::beginTransaction();
        try {
            User::create([
                'id' => $userId,
                'name' => $data['fullName'],
                'email' => $email,
                'password' => $data['password'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            Profile::create([
                'id' => $userId,
                'business_id' => null,
                'full_name' => $data['fullName'],
                'role' => 'superadmin',
                'email' => $email,
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw new HttpException(500, 'No fue posible crear el superadmin: ' . $e->getMessage());
        }

        $profile = Profile::find($userId);

        $this->logAudit($actorId, 'create_superadmin', null, $userId, [
            'admin_name' => $profile->full_name,
            'admin_email' => $profile->email,
        ]);

        return $profile;
    }

    /**
     * Deactivates a superadmin and kills any session they're currently holding. Guarded against
     * the two ways this could accidentally lock everyone out of /superadmin: revoking your own
     * account, or revoking the last active one — either leaves nobody able to undo it.
     */
    public function revokeSuperadmin(string $id, string $actorId): void
    {
        if ($id === $actorId) {
            throw new HttpException(422, 'No puedes revocar tu propia cuenta de superadmin.');
        }

        $profile = Profile::where('id', $id)->where('role', 'superadmin')->first();
        if (!$profile) {
            throw new NotFoundHttpException('Superadmin no encontrado.');
        }

        $activeCount = Profile::where('role', 'superadmin')->where('active', true)->count();
        if ($profile->active && $activeCount <= 1) {
            throw new HttpException(422, 'No puedes revocar el único superadmin activo — quedarían fuera todos los accesos.');
        }

        $profile->update(['active' => false, 'updated_at' => now()]);

        $user = User::find($id);
        $user?->tokens()->delete();

        $this->logAudit($actorId, 'revoke_superadmin', null, $id, [
            'admin_name' => $profile->full_name,
            'admin_email' => $profile->email,
        ]);
    }

    public function restoreSuperadmin(string $id, string $actorId): void
    {
        $profile = Profile::where('id', $id)->where('role', 'superadmin')->first();
        if (!$profile) {
            throw new NotFoundHttpException('Superadmin no encontrado.');
        }

        $profile->update(['active' => true, 'updated_at' => now()]);

        $this->logAudit($actorId, 'restore_superadmin', null, $id, [
            'admin_name' => $profile->full_name,
            'admin_email' => $profile->email,
        ]);
    }

    public function store(array $data, string $actorId): array
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

        $this->logAudit($actorId, 'create_business', $businessId, null, [
            'business_name' => $data['name'],
            'owner_email' => $email,
            'niche_type' => $data['nicheType'] ?? 'salon',
        ]);

        return [
            'businessId' => $businessId,
            'userId' => $userId,
        ];
    }

    public function update(string $id, array $data, string $actorId): Business
    {
        $business = Business::find($id);
        if (!$business) {
            throw new NotFoundHttpException('Negocio no encontrado.');
        }

        $changes = $this->diffChanges($business, $data);

        $business->update($data + ['updated_at' => now()]);

        if ($changes !== []) {
            $this->logAudit($actorId, 'update_business', $id, null, [
                'business_name' => $business->name,
                'changes' => $changes,
            ]);
        }

        return $business->fresh();
    }

    /**
     * Field-by-field [before, after] pairs for whatever the request actually changed — 'features'
     * gets its own nested diff (only the flags that flipped) since a blanket before/after of the
     * whole features object would bury the one toggle someone actually needs to find later.
     */
    private function diffChanges(Business $business, array $data): array
    {
        $changes = [];

        foreach ($data as $key => $newValue) {
            if ($key === 'features' && is_array($newValue)) {
                $oldFeatures = $business->features ?? [];
                $featureChanges = [];
                foreach ($newValue as $feature => $enabled) {
                    $wasEnabled = $oldFeatures[$feature] ?? null;
                    if ($wasEnabled !== $enabled) {
                        $featureChanges[$feature] = [$wasEnabled, $enabled];
                    }
                }
                if ($featureChanges !== []) {
                    $changes['features'] = $featureChanges;
                }
                continue;
            }

            $oldValue = $business->{$key} ?? null;
            if ($oldValue !== $newValue) {
                $changes[$key] = [$oldValue, $newValue];
            }
        }

        return $changes;
    }

    public function destroy(string $id, string $actorId): void
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

        $this->logAudit($actorId, 'delete_business', $id, null, [
            'business_name' => $business->name,
        ]);
    }

    public function suspend(string $id, string $actorId): void
    {
        $business = Business::find($id);
        if (!$business) {
            throw new NotFoundHttpException('Negocio no encontrado.');
        }

        $business->update(['active' => false, 'updated_at' => now()]);
        Profile::where('business_id', $id)
            ->where('role', '!=', 'superadmin')
            ->update(['active' => false, 'updated_at' => now()]);

        $this->logAudit($actorId, 'suspend_business', $id, null, [
            'business_name' => $business->name,
        ]);
    }

    public function resume(string $id, string $actorId): void
    {
        $business = Business::find($id);
        if (!$business) {
            throw new NotFoundHttpException('Negocio no encontrado.');
        }

        $business->update(['active' => true, 'updated_at' => now()]);
        Profile::where('business_id', $id)
            ->where('role', '!=', 'superadmin')
            ->update(['active' => true, 'updated_at' => now()]);

        $this->logAudit($actorId, 'resume_business', $id, null, [
            'business_name' => $business->name,
        ]);
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

    /**
     * Most recent superadmin actions — every business by default, or scoped to one. Eager-loads
     * actor/business so the frontend never has to resolve a bare UUID into a name itself.
     */
    public function auditLogs(?string $businessId = null, ?string $action = null, int $limit = 50): Collection
    {
        $query = SuperadminAuditLog::query()
            ->with(['actor:id,full_name,email', 'business:id,name'])
            ->orderByDesc('created_at')
            ->limit($limit);

        if ($businessId) {
            $query->where('business_id', $businessId);
        }
        if ($action) {
            $query->where('action', $action);
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
