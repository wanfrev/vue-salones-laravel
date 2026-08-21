<?php

namespace App\Http\Middleware;

use App\Models\Business;
use App\Services\BusinessContext;
use Closure;
use Illuminate\Http\Request;

/**
 * Must run AFTER auth:sanctum has resolved $request->user() — applied via the 'business-context'
 * alias on the protected route group in routes/api.php, not as global 'api' middleware. It used
 * to be global-prepended, which ran it before auth:sanctum (nested inside the same file) ever
 * authenticated the request, so $request->user() was always null here and BusinessContext never
 * bound. feature:/perm: silently no-op when that happens (fail open), which is why this went
 * unnoticed until capability: (fail closed, by design) started 403ing every staffing request.
 */
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
            canAccessInventory: (bool) $profile->can_access_inventory,
            canAccessPos: (bool) $profile->can_access_pos,
            canAccessSuppliers: (bool) $profile->can_access_suppliers,
            canAccessRequirements: (bool) $profile->can_access_requirements,
            disableInventoryEdit: (bool) $profile->disable_inventory_edit,
            canAddPurchaseInvoice: (bool) $profile->can_add_purchase_invoice,
        );

        app()->instance(BusinessContext::class, $context);
        app()->instance('biz_id', $context->businessId ?: null);
        app()->instance('branch_id', $context->branchId);

        return $next($request);
    }
}
