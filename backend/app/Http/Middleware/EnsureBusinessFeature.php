<?php

namespace App\Http\Middleware;

use App\Services\BusinessContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Route middleware: feature:<key>[,<key>...]. Blocks the request unless the resolved
 * BusinessContext (DEFAULT_FEATURES -> niche defaults -> stored -> niche locks, see
 * NicheRegistry::resolveFeatures) has every listed feature on.
 *
 * Report-only by default (config('niches.enforce') === false): logs what it would have
 * blocked instead of blocking, so this can ship without risking the 7 live businesses that
 * are not the target of any niche work yet. See config/niches.php for the switch.
 */
class EnsureBusinessFeature
{
    public function handle(Request $request, Closure $next, string ...$keys)
    {
        /** @var BusinessContext|null $context */
        $context = app()->bound(BusinessContext::class) ? app(BusinessContext::class) : null;

        // No resolvable business context (e.g. superadmin acting without a target business) —
        // nothing to gate against, let it through same as before this middleware existed.
        if (!$context || $context->isSuperadmin()) {
            return $next($request);
        }

        foreach ($keys as $key) {
            if ($context->hasFeature($key)) {
                continue;
            }

            if (!config('niches.enforce')) {
                Log::warning('gate.would_deny', [
                    'type' => 'feature',
                    'key' => $key,
                    'path' => $request->path(),
                    'business_id' => $context->businessId,
                    'profile_id' => $context->profileId,
                    'role' => $context->role,
                ]);
                continue;
            }

            return response()->json([
                'error' => ['message' => 'Este módulo no está disponible para este negocio.'],
            ], 403);
        }

        return $next($request);
    }
}
