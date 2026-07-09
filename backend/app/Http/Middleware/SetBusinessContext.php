<?php

namespace App\Http\Middleware;

use App\Services\BusinessContext;
use Closure;
use Illuminate\Http\Request;

class SetBusinessContext
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        $profile = $user?->profile;

        if (!$profile) {
            return $next($request);
        }

        $businessId = $profile->business_id
            ?? $request->input('business_id')
            ?? $request->header('X-Business-ID');

        // Branch: from profile (fixed for employees) or from header (selected by admin)
        // NEVER from query params — prevents tampering
        $branchId = $profile->branch_id
            ?? $request->header('X-Branch-ID');

        if ($profile->role !== 'superadmin' && $businessId) {
            if ($profile->business_id !== $businessId) {
                abort(403, 'No tienes acceso a este negocio.');
            }
        }

        $context = new BusinessContext(
            businessId: $businessId ?? $profile->business_id ?? '',
            branchId: $branchId,
            profileId: $profile->id,
            role: $profile->role ?? 'admin',
        );

        app()->instance(BusinessContext::class, $context);
        app()->instance('biz_id', $context->businessId ?: null);
        app()->instance('branch_id', $context->branchId);
        $request->merge(['_context' => $context]);

        return $next($request);
    }
}
