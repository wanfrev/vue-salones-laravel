<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureSuperadmin
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user()?->load('profile');

        if (!$user || $user->profile?->role !== 'superadmin') {
            return response()->json(['error' => ['message' => 'No autorizado.']], 403);
        }

        return $next($request);
    }
}
