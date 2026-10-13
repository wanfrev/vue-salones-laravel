<?php

namespace App\Http\Controllers\Api\Staffing;

use App\Models\StaffingSignature;
use App\Services\Staffing\SignatureImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * The logged-in approver's own drawn signature (opt-in, `staffing_approval_stamp`). It is only ever
 * read or written for the caller themselves — nobody can see or replace someone else's signature.
 */
class StaffingSignatureController
{
    public function show(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id || !StaffingSignature::tableExists()) {
            return response()->json(['image' => null]);
        }

        return response()->json([
            'image' => StaffingSignature::where('business_id', $p->business_id)->where('profile_id', $p->id)->value('image'),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if (!$p || !$p->business_id) {
            return response()->json(['error' => ['message' => 'Sin negocio asignado.']], 403);
        }
        if (!StaffingSignature::tableExists()) {
            return response()->json(['error' => ['message' => 'La firma aún no está disponible en este servidor.']], 409);
        }

        $data = $request->validate(['image' => 'required|string']);

        try {
            $image = SignatureImage::validate($data['image']);
        } catch (InvalidArgumentException $e) {
            return response()->json(['error' => ['message' => $e->getMessage()]], 422);
        }

        $existing = StaffingSignature::where('business_id', $p->business_id)->where('profile_id', $p->id)->first();
        if ($existing) {
            $existing->update(['image' => $image]);
        } else {
            StaffingSignature::create([
                'id' => Str::uuid()->toString(),
                'business_id' => $p->business_id,
                'profile_id' => $p->id,
                'image' => $image,
            ]);
        }

        return response()->json(['image' => $image]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $p = $request->user()?->load('profile')?->profile;
        if ($p && $p->business_id && StaffingSignature::tableExists()) {
            StaffingSignature::where('business_id', $p->business_id)->where('profile_id', $p->id)->delete();
        }

        return response()->json(null, 204);
    }
}
