<?php

namespace App\Http\Middleware;

use App\Services\BusinessContext;
use Closure;
use Illuminate\Http\Request;

/**
 * Route middleware for the appointment mutation endpoints (update/delete/status/time). Blocks a
 * plain 'empleado' whose "Puede agendar citas" toggle is off from changing anything about an
 * appointment — they can still view it (index/show are deliberately NOT behind this).
 *
 * Enforces unconditionally, unlike `perm:` (EnsureProfilePermission) — that one is report-only
 * until config('niches.enforce') is flipped, which exists to protect a niche-rollout feature's
 * existing users from an unexpected 403. This isn't a rollout: a business turning this toggle off
 * expects it to work today, not once someone else flips an unrelated global switch.
 */
class EnsureCanEditAppointments
{
    public function handle(Request $request, Closure $next)
    {
        /** @var BusinessContext|null $context */
        $context = app()->bound(BusinessContext::class) ? app(BusinessContext::class) : null;

        if (!$context || $context->canEditAppointments()) {
            return $next($request);
        }

        return response()->json([
            'error' => ['message' => 'No tienes permiso para modificar citas.'],
        ], 403);
    }
}
