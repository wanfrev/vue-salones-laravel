<?php

namespace App\Http\Controllers\Api;

use App\Models\Business;
use App\Services\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Aviso de cobro del servicio para el negocio. Solo lo recibe el admin (decisión de producto:
 * encargados y empleados nunca ven montos de la suscripción); a los demás se les responde 204.
 */
class BillingNoticeController
{
    public function __construct(private BillingService $billing) {}

    public function show(Request $request): JsonResponse|Response
    {
        $profile = $request->user()?->profile;
        if (!$profile || $profile->role !== 'admin' || !$profile->business_id) {
            return response()->noContent();
        }

        $business = Business::find($profile->business_id);
        $notice = $business ? $this->billing->noticeFor($business) : null;

        return $notice ? response()->json($notice) : response()->noContent();
    }
}
