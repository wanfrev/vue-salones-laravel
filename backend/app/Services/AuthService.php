<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AuthService
{
    public function login(string $email, string $password): array
    {
        $user = User::with('profile')->where('email', $email)->first();

        if (!$user || !Hash::check($password, $user->password)) {
            throw new HttpException(401, 'Credenciales inválidas.');
        }

        if ($user->profile && !$user->profile->active) {
            throw new HttpException(403, 'El usuario está inactivo.');
        }

        $token = $user->createToken('api-token')->plainTextToken;

        return [
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
        ];
    }

    public function logout(User $user): void
    {
        $user->currentAccessToken()?->delete();
    }

    public function refresh(User $user): array
    {
        $user->currentAccessToken()?->delete();
        $user->load('profile');
        $token = $user->createToken('api-token')->plainTextToken;

        return [
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
        ];
    }

    /**
     * Otros negocios (Business independientes, cada uno con su propio User+Profile) que el
     * mismo dueño puede alternar sin volver a poner contraseña — ver switchBusiness(). Vacío
     * si este usuario nunca fue vinculado a otro (owner_group_id null), que es el caso normal.
     */
    public function linkedBusinesses(User $user): array
    {
        if (!$user->owner_group_id) {
            return [];
        }

        return User::where('owner_group_id', $user->owner_group_id)
            ->where('id', '!=', $user->id)
            ->with('profile.business')
            ->get()
            ->filter(fn (User $linked) => $linked->profile?->business)
            ->map(fn (User $linked) => [
                'user_id' => $linked->id,
                'business_id' => $linked->profile->business_id,
                'business_name' => $linked->profile->business->name,
                'niche_type' => $linked->profile->business->niche_type,
                'full_name' => $linked->profile->full_name,
                'active' => (bool) $linked->profile->active,
            ])
            ->values()
            ->all();
    }

    /**
     * El dueño cambia de un negocio suyo a otro sin re-loguearse — mismo mecanismo de token que
     * SuperadminService::impersonate, pero sin expiración (esto es su propio negocio, no una
     * sesión de soporte) y solo permitido entre cuentas que comparten owner_group_id.
     */
    public function switchBusiness(User $currentUser, string $targetUserId): array
    {
        if (!$currentUser->owner_group_id) {
            throw new HttpException(403, 'Esta cuenta no tiene negocios vinculados.');
        }

        $target = User::with('profile')->find($targetUserId);

        if (!$target || $target->owner_group_id !== $currentUser->owner_group_id) {
            throw new HttpException(403, 'No tienes acceso a ese negocio.');
        }

        if (!$target->profile || !$target->profile->active) {
            throw new HttpException(403, 'Ese negocio está inactivo.');
        }

        $token = $target->createToken('api-token')->plainTextToken;

        return [
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $target,
        ];
    }

    public function changePassword(User $user, string $currentPassword, string $newPassword): void
    {
        if (!Hash::check($currentPassword, $user->password)) {
            throw new HttpException(400, 'La contraseña actual es incorrecta.');
        }

        if (strlen($newPassword) < 6) {
            throw new HttpException(400, 'La nueva contraseña debe tener al menos 6 caracteres.');
        }

        $user->password = bcrypt($newPassword);
        $user->save();
    }
}
