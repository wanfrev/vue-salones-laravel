<?php

namespace App\Http\Middleware;

use App\Models\Business;
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

        $resolvedBusinessId = $businessId ?? $profile->business_id ?? '';
        $nicheType = null;
        $rawFeatures = null;

        if ($resolvedBusinessId) {
            $business = Business::find($resolvedBusinessId);
            $nicheType = $business?->niche_type;
            $rawFeatures = $business?->features;
        }

        $context = new BusinessContext(
            businessId: $resolvedBusinessId,
            branchId: $branchId,
            profileId: $profile->id,
            role: $profile->role ?? 'admin',
            nicheType: $nicheType,
            rawFeatures: $rawFeatures,
        );

        app()->instance(BusinessContext::class, $context);
        app()->instance('biz_id', $context->businessId ?: null);
        app()->instance('branch_id', $context->branchId);
        $request->merge(['_context' => $context]);

        return $next($request);
    }
}
