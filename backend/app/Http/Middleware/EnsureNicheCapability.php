<?php

namespace App\Http\Middleware;

use App\Services\BusinessContext;
use Closure;
use Illuminate\Http\Request;

/**
 * Route middleware: capability:<name>[,<name>...]. Blocks unless the business's niche declares
 * every listed capability (see NicheRegistry::capabilities / config/niches.php).
 *
 * Unlike `feature:` and `perm:`, this one ENFORCES UNCONDITIONALLY — it never consults
 * config('niches.enforce'). That flag exists to keep the live businesses from hitting an
 * unexpected 403 on a module they already use; a capability-gated module is new by definition,
 * so it has no existing users to protect and can be strict from day one.
 *
 * The failure direction is also inverted on purpose. `feature:`/`perm:` let the request through
 * when no BusinessContext could be resolved; here that denies. A capability answers "does this
 * niche have this module at all", and the safe answer when we cannot tell is no.
 */
class EnsureNicheCapability
{
    public function handle(Request $request, Closure $next, string ...$capabilities)
    {
        /** @var BusinessContext|null $context */
        $context = app()->bound(BusinessContext::class) ? app(BusinessContext::class) : null;

        if (!$context) {
            return $this->deny();
        }

        // Superadmin bypasses so support can reach any business's data.
        if ($context->isSuperadmin()) {
            return $next($request);
        }

        foreach ($capabilities as $capability) {
            if (!$context->hasCapability($capability)) {
                return $this->deny();
            }
        }

        return $next($request);
    }

    private function deny()
    {
        return response()->json([
            'error' => ['message' => 'Este módulo no está disponible para este negocio.'],
        ], 403);
    }
}
