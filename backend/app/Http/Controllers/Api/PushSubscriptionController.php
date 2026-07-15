<?php

namespace App\Http\Controllers\Api;

use App\Models\PushSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PushSubscriptionController
{
    public function store(Request $request): JsonResponse
    {
        $p = $this->resolve($request);
        if (!$p || !$p->business_id) {
            return response()->json(['error' => 'Sin acceso.'], 403);
        }

        $request->validate([
            'endpoint' => 'required|string',
            'keys.p256dh' => 'required|string',
            'keys.auth' => 'required|string',
        ]);

        PushSubscription::updateOrCreate(
            [
                'endpoint' => $request->input('endpoint'),
                'p256dh' => $request->input('keys.p256dh'),
                'auth' => $request->input('keys.auth'),
            ],
            [
                'id' => Str::uuid()->toString(),
                'business_id' => $p->business_id,
                'profile_id' => $p->id,
                'user_agent' => $request->header('User-Agent'),
            ]
        );

        return response()->json(['success' => true]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $request->validate([
            'endpoint' => 'required|string',
        ]);

        PushSubscription::where('endpoint', $request->input('endpoint'))->delete();

        return response()->json(null, 204);
    }

    private function resolve(Request $request): ?object
    {
        $user = $request->user()?->load('profile');
        return $user?->profile;
    }
}
