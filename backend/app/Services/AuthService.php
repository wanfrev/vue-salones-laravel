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
