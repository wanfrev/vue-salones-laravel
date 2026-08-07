<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Guards profile mutation routes (create/update/delete). Without this, any authenticated
 * user — including a plain 'empleado' — could PUT /profiles/{any-id} and grant themselves
 * (or anyone) admin-level permissions (can_access_pos, role: encargado, etc.), since
 * ProfileController had no authorization check beyond auth:sanctum. Read routes
 * (GET /profiles, GET /profiles/{id}) stay unguarded — every authenticated user, including
 * plain employees, loads their own profile through them on login.
 */
class EnsureAdminPanelRole
{
    public function handle(Request $request, Closure $next)
    {
        $role = $request->user()?->profile?->role;

        if (!in_array($role, ['admin', 'superadmin', 'encargado'], true)) {
            return response()->json(['error' => ['message' => 'No autorizado.']], 403);
        }

        return $next($request);
    }
}
