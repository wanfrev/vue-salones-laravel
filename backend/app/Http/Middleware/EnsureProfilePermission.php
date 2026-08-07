<?php

namespace App\Http\Middleware;

use App\Services\BusinessContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Route middleware: perm:<key>, e.g. perm:inventory, perm:inventory-edit, perm:pos,
 * perm:suppliers. Blocks the request unless BusinessContext::hasProfilePermission($key)
 * passes — admin-panel roles always pass; a plain 'empleado'/'cajero' needs the matching
 * can_access_* flag on their profile (and, for inventory-edit, disable_inventory_edit=false).
 *
 * Report-only by default (config('niches.enforce') === false), same switch and same
 * discipline as EnsureBusinessFeature: logs what it would have blocked instead of blocking,
 * so this can ship without risking any live cajero/empleado whose can_access_pos flag was
 * never explicitly set. Flip config('niches.enforce') to true only after reviewing those
 * gate.would_deny logs.
 */
class EnsureProfilePermission
{
    public function handle(Request $request, Closure $next, string $key)
    {
        /** @var BusinessContext|null $context */
        $context = app()->bound(BusinessContext::class) ? app(BusinessContext::class) : null;

        if (!$context || $context->hasProfilePermission($key)) {
            return $next($request);
        }

        if (!config('niches.enforce')) {
            Log::warning('gate.would_deny', [
                'type' => 'permission',
                'key' => $key,
                'path' => $request->path(),
                'business_id' => $context->businessId,
                'profile_id' => $context->profileId,
                'role' => $context->role,
            ]);
            return $next($request);
        }

        return response()->json([
            'error' => ['message' => 'No tienes permiso para acceder a este módulo.'],
        ], 403);
    }
}
