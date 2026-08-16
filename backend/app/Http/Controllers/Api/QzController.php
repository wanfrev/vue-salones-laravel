<?php

namespace App\Http\Controllers\Api;

use App\Services\QzCertificateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Backs qz.security.setCertificatePromise / setSignaturePromise on the frontend — QZ Tray (the
 * local print bridge that talks raw ESC/POS to the receipt printer) needs both to trust that a
 * print request genuinely came from Luma. See QzCertificateService for what's actually signed.
 *
 * Returns a bare JSON string (not an object) — the frontend's apiFetch always calls res.json(),
 * so this keeps qzPrinter.ts on the same apiRequest<string>() helper every other service uses
 * instead of a one-off fetch with a text/plain Accept header.
 */
class QzController
{
    public function __construct(
        private QzCertificateService $qz,
    ) {}

    public function certificate(): JsonResponse
    {
        return response()->json($this->qz->certificate());
    }

    public function sign(Request $request): JsonResponse
    {
        $data = $request->validate([
            'request' => 'required|string',
        ]);

        return response()->json($this->qz->sign($data['request']));
    }
}
