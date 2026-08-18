<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureSuperadmin
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user()?->load('profile');

        // active is checked here (not just at login) because a revoked superadmin may already
        // hold a live token — see SuperadminService::revokeSuperadmin, which also deletes theirs,
        // but this is the backstop for any other token issued before the revoke.
        if (!$user || $user->profile?->role !== 'superadmin' || !$user->profile?->active) {
            return response()->json(['error' => ['message' => 'No autorizado.']], 403);
        }

        return $next($request);
    }
}
